
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, actions }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Also close on scroll
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); 
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
    }
  }, [onClose]);

  // Adjust position if it goes off screen
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const menuW = 200; // estimated
  const menuH = actions.length * 40; // estimated

  let finalX = x;
  let finalY = y;

  if (x + menuW > screenW) finalX = x - menuW;
  if (y + menuH > screenH) finalY = y - menuH;

  const style = {
    top: finalY,
    left: finalX,
  };

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={style}
      onContextMenu={(e) => {
          e.preventDefault();
          onClose();
      }}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => {
            if (!action.disabled) {
                action.onClick();
                onClose();
            }
          }}
          disabled={action.disabled}
          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
            ${action.disabled 
                ? 'opacity-40 cursor-not-allowed text-gray-500' 
                : action.danger 
                    ? 'text-red-400 hover:bg-gray-700/80' 
                    : 'text-gray-200 hover:bg-gray-700'
            }`}
        >
          {action.icon && <span className="w-4 h-4 text-gray-400">{action.icon}</span>}
          <span className="flex-1">{action.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};
