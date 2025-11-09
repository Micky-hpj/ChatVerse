import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// FIX: Aliased imported type to prevent name collision with the component.
import type { ChatMessage as ChatMessageType } from '../types';
import { UserIcon, BotIcon, CopyIcon, CheckIcon } from './Icons';

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading: boolean;
}

const CodeBlock: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
    const [copied, setCopied] = useState(false);
    const language = className?.replace('language-', '') || '';

    const handleCopy = () => {
        const codeString = String(children).replace(/\n$/, '');
        navigator.clipboard.writeText(codeString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="bg-gray-900/70 rounded-md my-2 text-sm">
            <div className="flex justify-between items-center px-4 py-1 bg-gray-700/80 text-xs text-gray-300 rounded-t-md">
                <span>{language}</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy code'}
                </button>
            </div>
             <SyntaxHighlighter
                children={String(children).replace(/\n$/, '')}
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
        </div>
    );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading }) => {
  const { role, content, image } = message;
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`w-full max-w-2xl px-4 py-3 rounded-xl shadow-md ${
          isUser
            ? 'bg-blue-600 ml-auto'
            : 'bg-gray-700 border border-gray-600/50'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
          </div>
        ) : (
          <div>
            {isUser && image && (
              <div className="mb-2">
                <img
                  src={`data:${image.mimeType};base64,${image.data}`}
                  alt="User upload"
                  className="rounded-lg max-w-xs h-auto"
                />
              </div>
            )}
            {content && (
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                      // FIX: Property 'inline' does not exist on type 'ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps'.
                      // This is a known issue with some versions of react-markdown types.
                      // The function signature is changed to accept the full props object, and `inline` is accessed after casting to `any`.
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-gray-300" />
        </div>
      )}
    </div>
  );
};