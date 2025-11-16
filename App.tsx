import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Modality } from '@google/genai';
import type { ChatMessage, ChatHistoryItem } from './types';
import { ChatInput } from './components/ChatInput';
import { ChatMessage as ChatMessageComponent } from './components/ChatMessage';
import { Sidebar } from './components/Sidebar';
import { ChatVerseIcon } from './components/Icons';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { SignIn } from './components/SignIn';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // On mount, check for a logged-in user
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setCurrentUser(savedUser);
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
    }
  }, []);

  // When currentUser changes, reset chat state and load their history
  useEffect(() => {
    if (currentUser) {
      // Reset current chat view
      setMessages([]);
      setCurrentChatId(null);
      initializeChat();

      // Load their history
      try {
        const savedHistory = localStorage.getItem(`chatHistory_${currentUser}`);
        if (savedHistory) {
          setChatHistory(JSON.parse(savedHistory));
        } else {
          setChatHistory([]); // No history for this user yet
        }
      } catch (error) {
        console.error("Failed to load chat history for user:", error);
        setChatHistory([]);
        localStorage.removeItem(`chatHistory_${currentUser}`);
      }
    } else {
      // User signed out, clear everything
      setChatHistory([]);
      setMessages([]);
      setCurrentChatId(null);
    }
  }, [currentUser]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      if (currentUser && chatHistory.length > 0) {
        localStorage.setItem(`chatHistory_${currentUser}`, JSON.stringify(chatHistory));
      } else if (currentUser && chatHistory.length === 0) {
        // If history is cleared for the current user, remove it from storage
        localStorage.removeItem(`chatHistory_${currentUser}`);
      }
    } catch (error) {
      console.error("Failed to save chat history to localStorage:", error);
    }
  }, [chatHistory, currentUser]);

  const initializeChat = useCallback(() => {
    try {
      if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        alert("API Key is not configured. Please set the API_KEY environment variable.");
        return;
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are a helpful and friendly AI assistant named ChatVerse. Format your responses using markdown.',
        },
      });
      setChat(newChat);
    } catch (error) {
      console.error("Error initializing chat:", error);
      alert("Failed to initialize the chat session. Please check your API key and network connection.");
    }
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save current chat messages to history when they change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChatHistory(prevHistory => {
        const chatIndex = prevHistory.findIndex(chat => chat.id === currentChatId);
        
        if (chatIndex !== -1) {
          // Update existing chat
          const updatedHistory = [...prevHistory];
          updatedHistory[chatIndex] = { ...updatedHistory[chatIndex], messages };
          return updatedHistory;
        } else {
          // Add new chat to history
          const firstUserMessage = messages.find(m => m.role === 'user');
          const title = firstUserMessage ? (firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')) : "New Chat";
          return [...prevHistory, { id: currentChatId, title, messages }];
        }
      });
    }
  }, [messages, currentChatId]);

  const handleImageGeneration = async (prompt: string) => {
    if (!prompt || isLoading) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = crypto.randomUUID();
      setCurrentChatId(chatId);
    }

    setIsLoading(true);
    const userMsgId = crypto.randomUUID();
    const modelMsgId = crypto.randomUUID();

    const userMessageEntry: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: `/imagine ${prompt}`,
    };

    const modelMessageEntry: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      content: '', // This will be the loading placeholder
    };

    setMessages((prevMessages) => [...prevMessages, userMessageEntry, modelMessageEntry]);

    try {
        if (!process.env.API_KEY) {
            throw new Error("API Key is not configured.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        let generatedImage: { data: string; mimeType: string; } | undefined;
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    generatedImage = {
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType
                    };
                    break;
                }
            }
        }
        
        if (generatedImage) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMsgId 
                ? { ...msg, content: '', image: generatedImage } 
                : msg
              )
            );
        } else {
            throw new Error("Image generation failed. No image data received from the API.");
        }

    } catch (error) {
        console.error('Error generating image:', error);
        const errorContent = error instanceof Error ? error.message : "An unknown error occurred during image generation.";
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === modelMsgId ? { ...msg, content: `Error: ${errorContent}` } : msg
            )
        );
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string, image?: { data: string; mimeType: string }) => {
    if (userMessage.trim().toLowerCase().startsWith('/imagine ')) {
        await handleImageGeneration(userMessage.substring(8).trim());
        return;
    }

    if (!chat || isLoading) return;

    let chatId = currentChatId;
    // If it's the start of a new conversation, create a new ID.
    if (!chatId) {
      chatId = crypto.randomUUID();
      setCurrentChatId(chatId);
    }

    const effectiveMessage = userMessage || (image ? "Describe this image." : "");
    if (!effectiveMessage.trim() && !image) {
      return;
    }

    setIsLoading(true);
    const userMsgId = crypto.randomUUID();
    const modelMsgId = crypto.randomUUID();

    const userMessageEntry: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: effectiveMessage,
      image,
    };

    const modelMessageEntry: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      content: '',
    };

    setMessages((prevMessages) => [...prevMessages, userMessageEntry, modelMessageEntry]);

    try {
      const messageParts: (string | { inlineData: { data: string; mimeType: string; } })[] = [];
      if (image) {
        messageParts.push({
          inlineData: {
            data: image.data,
            mimeType: image.mimeType,
          },
        });
      }
      messageParts.push(effectiveMessage);

      const result = await chat.sendMessageStream({ message: messageParts });

      let text = '';
      for await (const chunk of result) {
        text += chunk.text;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMsgId ? { ...msg, content: text } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorContent = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMsgId ? { ...msg, content: `Error: ${errorContent}` } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    initializeChat();
  };

  const handleLoadChat = (chatId: string) => {
    const chatToLoad = chatHistory.find(chat => chat.id === chatId);
    if (chatToLoad) {
      setCurrentChatId(chatToLoad.id);
      setMessages(chatToLoad.messages);
      initializeChat();
    }
  };

  const handleSignIn = (username: string) => {
    if (username.trim()) {
        try {
            localStorage.setItem('currentUser', username.trim());
            setCurrentUser(username.trim());
        } catch(error) {
            console.error("Failed to set user in localStorage:", error);
            alert("Could not sign in. Your browser might be configured to block local storage.");
        }
    }
  };

  const handleSignOut = () => {
      try {
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
      } catch(error) {
        console.error("Failed to sign out:", error);
      }
  };

  if (!currentUser) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-800 text-white">
      <Sidebar 
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center text-gray-400 py-8">
                <div className="p-5 bg-gradient-to-br from-blue-600 to-purple-700 rounded-full mb-6 shadow-lg">
                  <ChatVerseIcon className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">Welcome to ChatVerse</h1>
                <p className="mt-4 text-lg mb-8 max-w-2xl">
                  Your friendly AI assistant. Here are some of the things I can do. 
                  Start a new conversation to begin.
                </p>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 text-left px-4">
                    {/* General Intelligence & Reasoning */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">🌐 General Intelligence & Reasoning</h3>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Understand and respond in natural conversation</li>
                            <li>Deep reasoning (math, logic, planning, step-by-step problems)</li>
                            <li>Multi-turn memory (when you explicitly ask me to remember something)</li>
                            <li>Explain concepts at any level (beginner → expert)</li>
                        </ul>
                    </div>

                    {/* Text & Language */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">✍️ Text & Language</h3>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Write: essays, emails, articles, stories, scripts, poetry</li>
                            <li>Rewrite: simpler, more formal, longer, shorter</li>
                            <li>Translate between 100+ languages</li>
                            <li>Summarize long documents, books, transcripts</li>
                            <li>Analyze sentiment, tone, themes</li>
                            <li>Generate ideas: brainstorming, lists, outlines</li>
                        </ul>
                    </div>
                    
                    {/* Coding & Software Development */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">💻 Coding & Software Development</h3>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Write, debug, refactor code (Python, JS, Java, C#, C++, Rust, etc.)</li>
                            <li>Explain code behavior and errors</li>
                            <li>Build end-to-end projects (apps, games, APIs, websites)</li>
                            <li>Generate documentation and tests</li>
                            <li>Run Python code (with <code>python_user_visible</code> for user-visible output)</li>
                            <li>Create files: JSON, YAML, SQL, scripts, etc.</li>
                        </ul>
                    </div>
                    
                    {/* Web Browsing */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">🌐 Web Browsing (Real-Time Info)</h3>
                        <p className="text-sm mb-2 text-gray-300">When asked or needed, I can:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Search the internet</li>
                            <li>Check current data (news, sports, elections, finance, companies, people)</li>
                            <li>Visit websites and extract information</li>
                        </ul>
                        <p className="text-xs mt-2 italic text-gray-500">(I only browse when it fits policy — e.g., not for medical diagnosis.)</p>
                    </div>

                    {/* Images */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">🖼️ Images</h3>
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-semibold text-gray-300 text-sm">Image Generation</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 text-gray-400 mt-1">
                                    <li>Generate images (art, diagrams, icons, scenes, characters)</li>
                                    <li>Support multiple sizes and transparent backgrounds</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-300 text-sm">Image Editing</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 text-gray-400 mt-1">
                                    <li>Add/remove objects</li>
                                    <li>Change colors, styles, lighting</li>
                                    <li>Upscale or clean images</li>
                                    <li>Transform style (cartoon, painting, etc.)</li>
                                </ul>
                                <p className="text-xs italic text-gray-500 mt-1">(If you want an image of yourself, I must first ask for your selfie.)</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-300 text-sm">Image Understanding</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 text-gray-400 mt-1">
                                    <li>Describe images</li>
                                    <li>Extract text (OCR)</li>
                                    <li>Analyze graphs, charts, objects</li>
                                    <li>Explain issues or improvements</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    {/* Data, Files & Output */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">📊 Data, Files & Output</h3>
                        <p className="text-sm mb-1 text-gray-300">I can generate and export:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400 mb-2">
                            <li>PDFs (<code>reportlab</code>)</li>
                            <li>Word (DOCX)</li>
                            <li>PowerPoint (PPTX)</li>
                            <li>Excel (XLSX)</li>
                            <li>CSV, TXT, MD, RTF, ODT, ODS, ODP</li>
                        </ul>
                        <p className="text-sm mb-1 text-gray-300">I can also:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Make charts/plots with <code>matplotlib</code></li>
                            <li>Display dataframes interactively</li>
                            <li>Perform statistical analysis</li>
                        </ul>
                    </div>
                    
                    {/* Memory System */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">🧠 Memory System</h3>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Can store personal preferences only when you explicitly ask</li>
                            <li>You can tell me to forget anything</li>
                            <li>Never store sensitive info unless directly requested</li>
                        </ul>
                    </div>

                    {/* Canvas / Document Editing */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">🎨 Canvas / Document Editing</h3>
                        <p className="text-sm mb-1 text-gray-300">I can create:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400 mb-2">
                            <li>Editable documents</li>
                            <li>Full webpages</li>
                            <li>React components</li>
                            <li>Code files</li>
                            <li>Structured reports</li>
                        </ul>
                        <p className="text-sm text-gray-300">Then you can iterate on them with updates.</p>
                    </div>

                    {/* Special Skills */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">🤖 Special Skills</h3>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                            <li>Act as an assistant (schedule-style tasks, reminders within the chat)</li>
                            <li>Roleplay and simulate characters</li>
                            <li>Generate quizzes, flashcards, study materials</li>
                            <li>Provide tutoring for any subject</li>
                            <li>Solve step-by-step math (algebra → calculus → proofs)</li>
                            <li>Provide recommendations (movies, books, travel, recipes)</li>
                        </ul>
                    </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <ChatMessageComponent key={message.id} message={message} isLoading={isLoading && message.role === 'model' && message.content === ''} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>
        <footer className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
             <p className="text-center text-xs text-gray-500 mt-2">
              ChatVerse may display inaccurate info. Consider checking important information.
              {' | '}
              <button
                onClick={() => setShowPrivacyPolicy(true)}
                className="underline hover:text-gray-400"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </footer>
      </div>
      {showPrivacyPolicy && <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />}
    </div>
  );
};

export default App;
