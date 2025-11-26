import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, MicrophoneIcon, PaperclipIcon, ImageIcon, CubeIcon, CodeIcon } from './Icons';
import { PdfPreviewModal } from './PdfPreviewModal';

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

type GenerationMode = 'chat' | 'image' | '3d' | 'app';

interface ChatInputProps {
  onSendMessage: (message: string, image?: { data: string; mimeType: string }) => void;
  onGenerateImage: (prompt: string, image?: { data: string; mimeType: string }) => void;
  onGenerate3D: (prompt: string, image?: { data: string; mimeType: string }) => void;
  onGenerateApp: (prompt: string) => void;
  isLoading: boolean;
  selectedImage?: { data: string; mimeType: string } | null;
  onImageSelectionCleared?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    onGenerateImage, 
    onGenerate3D, 
    onGenerateApp, 
    isLoading,
    selectedImage,
    onImageSelectionCleared
}) => {
  const [value, setValue] = useState('');
  const [image, setImage] = useState<{ data: string; mimeType: string; name: string; } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mode, setMode] = useState<GenerationMode>('chat');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Handle external image selection (e.g., from "Edit Image")
  useEffect(() => {
    if (selectedImage) {
        setImage({ ...selectedImage, name: 'Image to edit' });
        setMode('image');
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
        onImageSelectionCleared?.();
    }
  }, [selectedImage, onImageSelectionCleared]);

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
  
  const handleModeChange = (newMode: GenerationMode) => {
    if (mode === newMode) {
      setMode('chat');
    } else {
      setMode(newMode);
      if (image && newMode !== 'image' && newMode !== '3d') setImage(null); // Clear image if switching to unsupported mode
    }
  };
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    const trimmedValue = value.trim();

    if (isLoading) {
        return;
    }
    if ((!trimmedValue && !image && mode === 'chat')) {
        return;
    }
    if ((!trimmedValue && !image && mode === '3d')) {
        return;
    }
    if ((!trimmedValue && mode === 'app')) {
        return;
    }

    if (mode === 'image') {
        onGenerateImage(trimmedValue, image ? { data: image.data, mimeType: image.mimeType } : undefined);
    } else if (mode === '3d') {
        onGenerate3D(trimmedValue, image ? { data: image.data, mimeType: image.mimeType } : undefined);
    } else if (mode === 'app') {
        onGenerateApp(trimmedValue);
    } else {
        onSendMessage(value, image ? { data: image.data, mimeType: image.mimeType } : undefined);
    }
    
    setValue('');
    setImage(null);
    setMode('chat');
  };

  const handleMicClick = () => {
    if (isLoading || !recognitionRef.current || mode !== 'chat') return;
    
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
    if (file) {
      if (file.type.startsWith('image/')) {
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
      } else if (file.type === 'application/pdf') {
        setPdfFile(file);
      }
    }
    if (e.target) {
        e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  const handlePdfImageSelect = (selectedImage: { data: string; mimeType: string }) => {
    setImage({
        ...selectedImage,
        name: `Page from ${pdfFile?.name ?? 'PDF'}`
    });
    setPdfFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholderText = {
    chat: 'Message...',
    image: image ? 'Describe how to edit this image...' : 'Describe the image you want to create...',
    '3d': image ? 'Describe the object in the image for 3D conversion...' : 'Describe the 3D model you want to create...',
    app: 'Describe the app you want to build...'
  };

  const isSubmitDisabled = isLoading || (mode === 'chat' ? (!value.trim() && !image) : (!value.trim() && !image));
  // Allow attachment for 3D mode as well
  const isAttachmentDisabled = isLoading || !!image || (mode !== 'chat' && mode !== 'image' && mode !== '3d');

  return (
    <div className="flex flex-col">
      {pdfFile && (
        <PdfPreviewModal
            file={pdfFile}
            onClose={() => setPdfFile(null)}
            onImageSelect={handlePdfImageSelect}
        />
      )}
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
            accept="image/*,application/pdf"
            className="hidden"
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText[mode]}
          rows={1}
          disabled={isLoading}
          enterKeyHint="send"
          className={`w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-lg p-3 pr-56 resize-none focus:ring-2 focus:outline-none disabled:opacity-50 transition-all duration-200 max-h-48 ${
            mode === 'image' ? 'focus:ring-purple-500' : mode === '3d' ? 'focus:ring-orange-500' : mode === 'app' ? 'focus:ring-green-500' : 'focus:ring-blue-500'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
           <button
            type="button"
            onClick={() => handleModeChange('image')}
            disabled={isLoading}
            className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                mode === 'image'
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-gray-400 hover:bg-gray-600'
            }`}
            title="Generate/Edit Image"
            >
                <ImageIcon className="w-5 h-5" />
            </button>
            <button
                type="button"
                onClick={() => handleModeChange('3d')}
                disabled={isLoading}
                className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                    mode === '3d'
                    ? 'text-orange-400 bg-orange-500/20'
                    : 'text-gray-400 hover:bg-gray-600'
                }`}
                title="Generate 3D Model"
            >
                <CubeIcon className="w-5 h-5" />
            </button>
            <button
                type="button"
                onClick={() => handleModeChange('app')}
                disabled={isLoading}
                className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                    mode === 'app'
                    ? 'text-green-400 bg-green-500/20'
                    : 'text-gray-400 hover:bg-gray-600'
                }`}
                title="Create App"
            >
                <CodeIcon className="w-5 h-5" />
            </button>

          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isAttachmentDisabled}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Attach image or PDF"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>
          {isSpeechRecognitionSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading || mode !== 'chat'}
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
            disabled={isSubmitDisabled}
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