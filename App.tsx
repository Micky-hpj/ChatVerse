
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Modality } from '@google/genai';
import type { ChatMessage, ChatHistoryItem } from './types';
import { ChatInput } from './components/ChatInput';
import { ChatMessage as ChatMessageComponent } from './components/ChatMessage';
import { Sidebar } from './components/Sidebar';
import { ChatVerseIcon, CubeIcon, CodeIcon, ImageIcon, MessageSquareIcon } from './components/Icons';
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
  const [editImage, setEditImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setInstallPrompt(null);
  };

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

  // When currentUser changes, load their data (history)
  useEffect(() => {
    if (currentUser) {
      // Reset current chat view
      setMessages([]);
      setCurrentChatId(null);
      initializeChat();

      try {
        // Load chat history
        const savedHistory = localStorage.getItem(`chatHistory_${currentUser}`);
        if (savedHistory) {
          setChatHistory(JSON.parse(savedHistory));
        } else {
            setChatHistory([]);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    }
  }, [currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const newChat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are ChatVerse, a helpful, witty, and knowledgeable AI assistant. You can write code, generate images (using a separate tool), create 3D models, and help with analysis.",
      },
    });
    setChat(newChat);
  };

  const saveChatHistory = (chatId: string, updatedMessages: ChatMessage[]) => {
      if (!currentUser) return;

      const title = updatedMessages[0]?.content.slice(0, 30) + (updatedMessages[0]?.content.length > 30 ? '...' : '') || 'New Chat';
      
      setChatHistory((prevHistory) => {
          const existingIndex = prevHistory.findIndex(item => item.id === chatId);
          let newHistory;
          
          if (existingIndex >= 0) {
              newHistory = [...prevHistory];
              newHistory[existingIndex] = { ...newHistory[existingIndex], messages: updatedMessages, title };
          } else {
              newHistory = [...prevHistory, { id: chatId, title, messages: updatedMessages }];
          }

          try {
             localStorage.setItem(`chatHistory_${currentUser}`, JSON.stringify(newHistory));
          } catch (e: any) {
              // Handle quota exceeded
             if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
                 // Simplistic strategy: remove the oldest chat
                 if (newHistory.length > 1) {
                     newHistory.shift();
                     try {
                        localStorage.setItem(`chatHistory_${currentUser}`, JSON.stringify(newHistory));
                     } catch (retryError) {
                         console.error("Failed to save history even after cleanup", retryError);
                     }
                 }
             }
          }
          return newHistory;
      });
  };

  const handleSendMessage = async (text: string, image?: { data: string; mimeType: string }) => {
    if (!chat) return;
    
    // Ensure we have a valid chat ID
    const chatId = currentChatId || Date.now().toString();
    if (!currentChatId) setCurrentChatId(chatId);

    setIsLoading(true);
    const newMessageId = Date.now().toString();

    const userMessage: ChatMessage = {
      id: newMessageId,
      role: 'user',
      content: text,
      image,
    };

    setMessages((prev) => {
        const newMessages = [...prev, userMessage];
        // Save immediately so we don't lose user message if error occurs
        saveChatHistory(chatId, newMessages);
        return newMessages;
    });

    try {
      let result;
      
      if (image) {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const promptParts: any[] = [{ text }];
          promptParts.push({
             inlineData: {
                 mimeType: image.mimeType,
                 data: image.data
             }
          });
          
          result = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: promptParts }
          });

      } else {
          result = await chat.sendMessage({ message: text });
      }

      const responseText = result.text;

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
      };

      setMessages((prev) => {
          const newMessages = [...prev, botMessage];
          saveChatHistory(chatId, newMessages);
          return newMessages;
      });

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageGeneration = async (prompt: string, inputImage?: { data: string; mimeType: string }) => {
      const chatId = currentChatId || Date.now().toString();
      if (!currentChatId) setCurrentChatId(chatId);

      setIsLoading(true);
      
      // Add user message
      setMessages(prev => {
          const content = inputImage ? `Edit image: ${prompt}` : `Generate image: ${prompt}`;
          const newMsg: ChatMessage = { 
              id: Date.now().toString(), 
              role: 'user', 
              content,
              image: inputImage 
          };
          saveChatHistory(chatId, [...prev, newMsg]);
          return [...prev, newMsg];
      });

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const parts: any[] = [];
          if (inputImage) {
              parts.push({
                  inlineData: {
                      data: inputImage.data,
                      mimeType: inputImage.mimeType
                  }
              });
          }
          parts.push({ text: prompt });

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts },
              config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
              }
          });

          let imageUrl = '';
          // Iterate through parts to find the image
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageUrl = part.inlineData.data;
                    break;
                }
            }
          }

          if (imageUrl) {
              const botMessage: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  role: 'model',
                  content: inputImage ? `Here is your edited image for "${prompt}"` : `Here is your image for "${prompt}"`,
                  image: {
                      data: imageUrl,
                      mimeType: 'image/png'
                  }
              };
              setMessages(prev => {
                  const newMsgs = [...prev, botMessage];
                  saveChatHistory(chatId, newMsgs);
                  return newMsgs;
              });
          } else {
              throw new Error("No image data returned");
          }

      } catch (error) {
          console.error("Image Gen Error:", error);
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Failed to generate image. Please try again." }]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleTriggerEditImage = (img: { data: string; mimeType: string }) => {
      setEditImage(img);
  };

  const handle3DGeneration = async (prompt: string, inputImage?: { data: string; mimeType: string }) => {
    const chatId = currentChatId || Date.now().toString();
    if (!currentChatId) setCurrentChatId(chatId);

    setIsLoading(true);
    
    // Add user message
    setMessages(prev => {
        const content = inputImage ? `Convert image to 3D: ${prompt}` : `Generate 3D Model: ${prompt}`;
        const newMsg: ChatMessage = { 
            id: Date.now().toString(), 
            role: 'user', 
            content,
            image: inputImage 
        };
        saveChatHistory(chatId, [...prev, newMsg]);
        return [...prev, newMsg];
    });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const fullPrompt = `
        Create a highly detailed, fully functional, single-file HTML 3D application using Three.js to visualize: "${prompt}".
        ${inputImage ? "Analyze the attached image and create a 3D representation of the main object depicted. Use Three.js primitives and advanced geometries composed together to approximate the shape and look." : ""}
        
        CRITICAL IMPLEMENTATION DETAILS:
        1. Import Map:
        <script type="importmap">
          {
            "imports": {
              "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
              "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
              "lil-gui": "https://unpkg.com/lil-gui@0.19.1/dist/lil-gui.esm.min.js"
            }
          }
        </script>

        2. Setup:
           - Script type="module".
           - WebGLRenderer (antialias: true, alpha: true, shadowMap enabled, toneMapping = THREE.ACESFilmicToneMapping).
           - PerspectiveCamera.
           - **OrbitControls**: Enable interaction (zoom, pan, rotate). Set \`enableDamping: true\` and \`dampingFactor: 0.05\`. Set \`autoRotate: true\`.
           - **Lighting Setup**:
             - HemisphereLight (skyColor: 0xffffff, groundColor: 0x444444, intensity: 0.6).
             - DirectionalLight (Key light, color: 0xffffff, intensity: 1, castShadow enabled, position set).
             - AmbientLight (soft fill, intensity: 0.3).
           - Scene: GridHelper and a ground PlaneGeometry (receiveShadow: true, dark matte material). Set \`scene.background\` to a new THREE.Color('#111111').

        3. **Dynamic Controls (GUI) - REQUIRED**:
           - Import \`GUI\` from 'lil-gui'.
           - Initialize \`const gui = new GUI();\`.
           
           - **Lighting Folder**:
             - Add controls for **Directional Light**: Intensity (0-2), Color, Position X/Y/Z (-10 to 10).
             - Add controls for **Ambient Light**: Intensity (0-1).

           - **Scene & Camera Folder**:
             - **Background Color**: Add a color controller (e.g., \`params.backgroundColor\`) that updates \`scene.background\`.
             - **Auto Rotate**: Add a checkbox to toggle \`controls.autoRotate\`.
             - **Rotation Speed**: Add a slider for \`controls.autoRotateSpeed\` (0 to 20).
             - **Wireframe Mode**: Add a checkbox to toggle wireframe on all meshes.

        4. ADVANCED MODELING INSTRUCTIONS (CRITICAL):
           - **NO EXTERNAL ASSETS**: You cannot load .obj/.gltf files. You MUST write code to build the geometry.
           - **CHARACTER / PERSON GENERATION (e.g., "Shah Rukh Khan", "Iron Man"):**
             * **Hierarchical Construction**: Create a "Mannequin" or "Art Toy" style figure using \`THREE.Group\`.
             * **Body Parts**: 
               - Use \`SphereGeometry\` or \`dodecahedronGeometry\` for the head.
               - Use \`CylinderGeometry\` or \`BoxGeometry\` (scaled) for torso and limbs.
               - Use \`SphereGeometry\` for joints (shoulders, elbows, knees) to make it look organic.
             * **Likeness & Identity**: 
               - **Costume**: Apply specific colors and \`MeshStandardMaterial\` to specific body parts to match the character's iconic outfit (e.g., black suit, colorful jacket, superhero armor).
               - **Hair**: Construct specific hairstyles using multiple overlapping \`SphereGeometry\` or \`ConeGeometry\` primitives, or use \`LatheGeometry\`.
               - **Face**: If possible, use a helper function to draw a simple face (eyes, mouth) on a canvas and use it as a \`map\` for the head material.
               - **Accessories**: Add details like sunglasses, swords, capes, or hats using primitives.
           - **COMPLEX OBJECTS**: Deconstruct into geometric primitives. Use \`THREE.ExtrudeGeometry\` for complex 2D profiles extruded to 3D.
           - **Materials**: Use \`MeshStandardMaterial\` with appropriate \`roughness\` and \`metalness\` to enhance realism under the dynamic lights.

        5. Animation:
           - Add a simple idle animation inside the requestAnimationFrame loop (e.g., \`bodyGroup.position.y = Math.sin(Date.now() * 0.002) * 0.1;\` or arm swaying).

        6. Output:
           - Return ONLY the raw HTML code starting with <!DOCTYPE html>.
           - Do not use markdown backticks.
        `;

        const parts: any[] = [];
        if (inputImage) {
            parts.push({
                inlineData: {
                    data: inputImage.data,
                    mimeType: inputImage.mimeType
                }
            });
        }
        parts.push({ text: fullPrompt });

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        });

        const generatedHtml = result.text.replace(/```html/g, '').replace(/```/g, '').trim();

        const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: `Here is your 3D scene based on "${prompt}". Use the GUI to adjust lighting, background, and camera settings. You can also zoom (scroll), pan (right-click), and rotate (left-click) the view.\n\n\`\`\`html\n${generatedHtml}\n\`\`\``,
        };

        setMessages(prev => {
            const newMsgs = [...prev, botMessage];
            saveChatHistory(chatId, newMsgs);
            return newMsgs;
        });

    } catch (error) {
        console.error("3D Generation Error:", error);
         setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAppGeneration = async (prompt: string) => {
    const chatId = currentChatId || Date.now().toString();
    if (!currentChatId) setCurrentChatId(chatId);

    setIsLoading(true);
    
    setMessages(prev => {
        const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: `Create App: ${prompt}` };
        saveChatHistory(chatId, [...prev, newMsg]);
        return [...prev, newMsg];
    });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const fullPrompt = `
        Create a single-file HTML/CSS/JS web application based on this request: "${prompt}".
        
        Requirements:
        1. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
        2. Use FontAwesome for icons if needed.
        3. Make the design modern, responsive, and visually appealing (dark mode preferred).
        4. Include all functionality within the single file.
        5. Return ONLY the HTML code starting with <!DOCTYPE html>.
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt
        });
        
        const generatedCode = result.text.replace(/```html/g, '').replace(/```/g, '').trim();

        const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: `Here is your app based on "${prompt}".\n\n\`\`\`html\n${generatedCode}\n\`\`\``,
        };

        setMessages(prev => {
            const newMsgs = [...prev, botMessage];
            saveChatHistory(chatId, newMsgs);
            return newMsgs;
        });

    } catch (error) {
        console.error("App Generation Error:", error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Failed to generate the app. Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };


  const handleNewChat = () => {
      setMessages([]);
      setCurrentChatId(null);
      initializeChat();
  };

  const handleLoadChat = (id: string) => {
      const historyItem = chatHistory.find(item => item.id === id);
      if (historyItem) {
          setCurrentChatId(id);
          setMessages(historyItem.messages);
          // Re-initialize chat model context if needed, though for this simple app 
          // we are just loading messages. The next sendMessage will grab a new instance 
          // or we can reuse the existing one.
          initializeChat();
      }
  };
  
  const handleSignIn = (username: string) => {
      setCurrentUser(username);
      localStorage.setItem('currentUser', username);
  };

  const handleSignOut = () => {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      setMessages([]);
      setChatHistory([]);
  };
  
  if (!currentUser) {
      return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <div className="flex h-screen bg-gray-800 text-white overflow-hidden">
      <Sidebar 
        onNewChat={handleNewChat} 
        chatHistory={chatHistory} 
        currentChatId={currentChatId}
        onLoadChat={handleLoadChat}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
      />

      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 bg-gray-900/50 border-b border-gray-700 flex items-center justify-between px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
              <ChatVerseIcon className="w-6 h-6 text-blue-500" />
              <h1 className="text-lg font-semibold text-gray-100 hidden sm:block">
                  {currentChatId ? chatHistory.find(c => c.id === currentChatId)?.title || 'Chat' : 'New Conversation'}
              </h1>
          </div>
          <div className="flex items-center gap-4">
              
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <ChatVerseIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Welcome to ChatVerse</h2>
              <p className="text-gray-400 max-w-md mb-8">
                Your AI companion powered by Google's Gemini models.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                 <button 
                    onClick={() => handleSendMessage("Help me write a Python script to analyze CSV files.")}
                    className="p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-xl text-left transition-all hover:scale-[1.02]"
                 >
                    <div className="flex items-center gap-3 mb-2">
                        <MessageSquareIcon className="w-5 h-5 text-blue-400" />
                        <span className="font-semibold">Chat & Code</span>
                    </div>
                    <p className="text-sm text-gray-400">Ask questions, debug code, or get creative writing help.</p>
                 </button>

                 <button 
                    onClick={() => handleImageGeneration("A futuristic city floating in the clouds, cyberpunk style.")}
                    className="p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-xl text-left transition-all hover:scale-[1.02]"
                 >
                    <div className="flex items-center gap-3 mb-2">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                        <span className="font-semibold">Generate Images</span>
                    </div>
                    <p className="text-sm text-gray-400">Create stunning visuals with Gemini Flash Image.</p>
                 </button>

                 <button 
                    onClick={() => handle3DGeneration("A low-poly spinning globe with glowing cities.")}
                    className="p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-xl text-left transition-all hover:scale-[1.02]"
                 >
                    <div className="flex items-center gap-3 mb-2">
                        <CubeIcon className="w-5 h-5 text-orange-400" />
                        <span className="font-semibold">3D Models</span>
                    </div>
                    <p className="text-sm text-gray-400">Generate interactive 3D scenes using Three.js.</p>
                 </button>

                 <button 
                    onClick={() => handleAppGeneration("A Pomodoro timer with a todo list.")}
                    className="p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-xl text-left transition-all hover:scale-[1.02]"
                 >
                    <div className="flex items-center gap-3 mb-2">
                        <CodeIcon className="w-5 h-5 text-green-400" />
                        <span className="font-semibold">Build Web Apps</span>
                    </div>
                    <p className="text-sm text-gray-400">Create single-file tools and games instantly.</p>
                 </button>
              </div>
              <button 
                onClick={() => setShowPrivacyPolicy(true)}
                className="mt-8 text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Privacy Policy
              </button>
            </div>
          ) : (
            <div className="space-y-6 pb-4 max-w-4xl mx-auto">
              {messages.map((msg) => (
                <ChatMessageComponent 
                    key={msg.id} 
                    message={msg} 
                    isLoading={isLoading && msg.id === messages[messages.length - 1].id && msg.role === 'model' && !msg.content}
                    onEditImage={handleTriggerEditImage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="max-w-4xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              onGenerateImage={handleImageGeneration}
              onGenerate3D={handle3DGeneration}
              onGenerateApp={handleAppGeneration}
              isLoading={isLoading} 
              selectedImage={editImage}
              onImageSelectionCleared={() => setEditImage(null)}
            />
            <p className="text-center text-xs text-gray-500 mt-2">
              Gemini may display inaccurate info, including about people, so double-check its responses.
            </p>
          </div>
        </div>
      </div>

      {showPrivacyPolicy && (
        <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
      )}
    </div>
  );
};

export default App;
