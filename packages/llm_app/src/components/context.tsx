import { useRef, useEffect } from 'react';
import { Trash } from 'lucide-react';
interface ContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

const ContextMenu = ({ x, y, onDelete, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-lg py-1 z-50 border border-pink-200 dark:border-pink-700"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          onClose();
        }}
        type="button"
        className="flex items-center px-4 py-2 hover:bg-pink-100 dark:hover:bg-pink-800 cursor-pointer"
      >
        <Trash className="w-4 h-4 mr-2" />
        <span>Delete</span>
      </button>
    </div>
  );
};

export default ContextMenu;
