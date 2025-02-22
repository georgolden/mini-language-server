import type React from 'react';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { PORTAL_ROOT_ID } from '@utils/portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

const getSizeClassName = (size: ModalProps['size']) => {
  switch (size) {
    case 'sm':
      return 'min-w-[300px] max-w-[500px]';
    case 'lg':
      return 'min-w-[900px] max-w-[100px]';
    default:
      return 'min-w-[600px] max-w-[800px]';
  }
};

const Modal = ({ isOpen, onClose, children, title, size }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.close();
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInteraction = (
    e: React.MouseEvent<HTMLDialogElement> | React.KeyboardEvent<HTMLDialogElement>,
  ) => {
    const dialog = dialogRef.current;
    if (dialog && e.target === dialog) {
      if (
        ('key' in e && (e.key === 'Enter' || e.key === ' ')) ||
        ('type' in e && e.type === 'click')
      ) {
        onClose();
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleInteraction}
      onKeyDown={handleInteraction}
      className="bg-transparent p-0 m-auto border-none backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`${getSizeClassName(size)} rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
          {title && (
            <h2 id="modal-title" className="text-lg font-semibold text-pink-600 dark:text-pink-300">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClose();
              }
            }}
            className="ml-auto rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-pink-500 dark:text-pink-400" />
          </button>
        </div>
        <div className="p-4 relative text-gray-700 dark:text-gray-300">
          {children}
          <div id={PORTAL_ROOT_ID} />
        </div>
      </div>
    </dialog>
  );
};

export default Modal;
