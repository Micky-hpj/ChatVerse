
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// FIX: Aliased imported type to prevent name collision with the component.
import type { ChatMessage as ChatMessageType } from '../types';
import { UserIcon, BotIcon, CopyIcon, CheckIcon, RefreshIcon, ThumbsUpIcon, ThumbsDownIcon, EyeIcon, EditIcon } from './Icons';
import { ContextMenu } from './ContextMenu';
import { CodePreview } from './CodePreview';

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading: boolean;
  onRegenerate?: (id: string) => void;
  onFeedback?: (id: string, type: 'positive' | 'negative') => void;
  onEditImage?: (image: { data: string; mimeType: string }) => void;
}

const CodeBlock: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
    const [copied, setCopied] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const language = className?.replace('language-', '') || '';
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(codeString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Allow preview for HTML, XML (often SVG), or if language is undefined but looks like HTML
    const isPreviewable = language === 'html' || language === 'xml' || (language === '' && codeString.trim().startsWith('<'));

    return (
        <div className="bg-gray-900/70 rounded-md my-2 text-sm">
            <div className="flex justify-between items-center px-4 py-1 bg-gray-700/80 text-xs text-gray-300 rounded-t-md">
                <span className="font-mono">{language || 'text'}</span>
                <div className="flex items-center gap-3">
                    {isPreviewable && (
                        <button 
                            onClick={() => setShowPreview(true)} 
                            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <EyeIcon className="h-4 w-4" />
                            Preview
                        </button>
                    )}
                    <button onClick={handleCopy} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
             <SyntaxHighlighter
                children={codeString}
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    backgroundColor: 'transparent',
                    overflowX: 'auto',
                }}
                codeTagProps={{
                    style: {
                        fontFamily: 'inherit',
                    }
                }}
            />
            {showPreview && (
                <CodePreview code={codeString} onClose={() => setShowPreview(false)} />
            )}
        </div>
    );
};

const ThinkingLoader: React.FC = () => (
    <div className="flex items-center gap-3 py-1">
        <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-br from-blue-500 to-purple-600"></span>
        </div>
        <span className="text-sm font-medium text-gray-300 animate-pulse">Thinking...</span>
    </div>
);

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading, onRegenerate, onFeedback, onEditImage }) => {
  const { role, content, image } = message;
  const isUser = role === 'user';
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopyMessage = () => {
      navigator.clipboard.writeText(content);
  };

  const menuActions = [
      {
          label: 'Copy Text',
          icon: <CopyIcon />,
          onClick: handleCopyMessage,
          disabled: !content
      },
      ...(image ? [
          {
              label: 'Edit Image',
              icon: <EditIcon />,
              onClick: () => onEditImage?.(image)
          }
      ] : []),
      ...(role === 'model' ? [
          {
              label: 'Regenerate Response',
              icon: <RefreshIcon />,
              onClick: () => onRegenerate?.(message.id),
              disabled: isLoading
          },
          {
              label: 'Good Response',
              icon: <ThumbsUpIcon />,
              onClick: () => onFeedback?.(message.id, 'positive')
          },
          {
              label: 'Bad Response',
              icon: <ThumbsDownIcon />,
              onClick: () => onFeedback?.(message.id, 'negative')
          }
      ] : [])
  ];

  return (
    <>
        <div 
            className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}
            onContextMenu={handleContextMenu}
        >
        {!isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center select-none">
            <BotIcon className="w-5 h-5 text-white" />
            </div>
        )}
        <div
            className={`w-full max-w-2xl px-4 py-3 rounded-xl shadow-md transition-shadow hover:shadow-lg ${
            isUser
                ? 'bg-blue-600 ml-auto'
                : 'bg-gray-700 border border-gray-600/50'
            }`}
        >
            {isLoading && !content ? (
            <ThinkingLoader />
            ) : (
            <div>
                {image && (
                <div className="mb-2">
                    <img
                    src={`data:${image.mimeType};base64,${image.data}`}
                    alt={isUser ? "User upload" : "Generated image"}
                    className="rounded-lg max-w-full md:max-w-md h-auto"
                    />
                </div>
                )}
                {content && (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3">
                    <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code(props) {
                            const { node, inline, className, children, ...rest } = props as any;
                            return !inline ? (
                                <CodeBlock className={className}>
                                    {children}
                                </CodeBlock>
                            ) : (
                                <code className="bg-gray-800 text-purple-300 rounded-sm px-1.5 py-0.5 text-sm font-mono" {...rest}>
                                    {children}
                                </code>
                            );
                        },
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" />,
                        ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside" />,
                        ol: ({node, ...props}) => <ol {...props} className="list-decimal list-inside" />,
                    }}
                >
                    {content}
                </ReactMarkdown>
                </div>
                )}
            </div>
            )}
        </div>
        {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center select-none">
            <UserIcon className="w-5 h-5 text-gray-300" />
            </div>
        )}
        </div>
        
        {contextMenu && (
            <ContextMenu 
                x={contextMenu.x} 
                y={contextMenu.y} 
                onClose={() => setContextMenu(null)}
                actions={menuActions}
            />
        )}
    </>
  );
};
