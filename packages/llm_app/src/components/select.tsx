import { type FC, type ReactNode, memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { PORTAL_ROOT_ID } from '@utils/portal';

const KawaiiSelect: FC<{
  value?: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: ReactNode }>;
}> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [maxHeight, setMaxHeight] = useState<number>(500);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const newMaxHeight = Math.min(300, spaceBelow - 8);

        setPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
        setMaxHeight(newMaxHeight);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      updatePosition();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const portalContainer = document.getElementById(PORTAL_ROOT_ID);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-pink-100 dark:bg-pink-900 border-2 border-pink-300 dark:border-pink-600 rounded-full px-4 py-2 text-pink-700 dark:text-pink-100 flex items-center gap-2 min-w-[200px] hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
      >
        <span className="flex-1 text-left">{selectedOption?.label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {isOpen &&
        portalContainer &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: buttonRef.current?.offsetWidth,
              maxHeight: `${maxHeight}px`,
              zIndex: 9999,
            }}
            className="fixed bg-pink-50 dark:bg-pink-900 border-2 border-pink-300 dark:border-pink-600 rounded-lg shadow-lg overflow-y-auto pointer-events-auto"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-pink-700 dark:text-pink-100 hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors flex items-center gap-2"
              >
                {option.value === value && <span className="text-pink-500">♥</span>}
                <span className="flex-1">{option.label}</span>
              </button>
            ))}
          </div>,
          portalContainer,
        )}
    </>
  );
};

export default memo(KawaiiSelect);
