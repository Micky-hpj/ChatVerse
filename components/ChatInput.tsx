import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, MicrophoneIcon, PaperclipIcon } from './Icons';

// FIX: Add type definitions for the Web Speech API to resolve TypeScript errors.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface ChatInputProps {
  onSendMessage: (message: string, image?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [value, setValue] = useState('');
  const [image, setImage] = useState<{ data: string; mimeType: string; name: string; } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
      console.log("Speech recognition not supported by this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'network') {
        alert("Speech recognition failed due to a network error. Please check your internet connection and try again.");
      } else {
        alert(`An error occurred during speech recognition: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      setValue(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSpeechRecognitionSupported]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if ((value.trim() || image) && !isLoading) {
      onSendMessage(value, image ? { data: image.data, mimeType: image.mimeType } : undefined);
      setValue('');
      setImage(null);
    }
  };

  const handleMicClick = () => {
    if (isLoading || !recognitionRef.current) return;
    
    if (isListening) {
      handleSubmit();
    } else {
      recognitionRef.current.start();
    }
  };
  
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({
          data: base64String,
          mimeType: file.type,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
        e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col">
      {image && (
        <div className="mb-2 p-2 bg-gray-700 rounded-lg flex items-center justify-between text-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-2 overflow-hidden">
                <img src={`data:${image.mimeType};base64,${image.data}`} alt="Preview" className="w-10 h-10 rounded-md object-cover" />
                <span className="text-gray-300 truncate">{image.name}</span>
            </div>
            <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                title="Remove image"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message ChatVerse..."
          rows={1}
          disabled={isLoading}
          className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-lg p-3 pr-36 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-all duration-200 max-h-48"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isLoading || !!image}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Attach image"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>
          {isSpeechRecognitionSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading}
              className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                isListening 
                  ? 'text-red-500 animate-pulse bg-red-500/20' 
                  : 'text-gray-400 hover:bg-gray-600'
              }`}
              title={isListening ? 'Stop and send message' : 'Use microphone'}
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || (!value.trim() && !image)}
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <SendIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};