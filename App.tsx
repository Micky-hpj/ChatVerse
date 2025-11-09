import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { ChatMessage, ChatHistoryItem } from './types';
import { ChatInput } from './components/ChatInput';
import { ChatMessage as ChatMessageComponent } from './components/ChatMessage';
import { Sidebar } from './components/Sidebar';
import { ChatVerseIcon } from './components/Icons';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage:", error);
      localStorage.removeItem('chatHistory');
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);
  
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
// FIX: Added curly braces to the catch block to fix a syntax error that caused all subsequent errors.
      console.error("Error initializing chat:", error);
      alert("Failed to initialize the chat session. Please check your API key and network connection.");
    }
  }, []);
  
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

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


  const handleSendMessage = async (userMessage: string, image?: { data: string; mimeType: string }) => {
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

      // FIX: The sendMessageStream method expects an object with a `message` property,
      // which was missing. The `messageParts` array is now correctly passed
      // inside this object.
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


  return (
    <div className="flex h-screen overflow-hidden bg-gray-800 text-white">
      <Sidebar 
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
      />
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto h-full">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                <div className="p-5 bg-gradient-to-br from-blue-600 to-purple-700 rounded-full mb-6 shadow-lg">
                  <ChatVerseIcon className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">Welcome to ChatVerse</h1>
                <p className="mt-4 text-lg">Your friendly AI assistant. Start a new conversation to begin.</p>
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
              <a href="#" className="underline hover:text-gray-400">Privacy Policy</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;