interface KawaiiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const KawaiiButton = ({
  children,
  variant = 'primary',
  icon,
  fullWidth,
  className = '',
  ...props
}: KawaiiButtonProps) => {
  const baseStyles =
    'relative group px-4 py-2 rounded-full transition-all duration-200 flex items-center justify-center gap-2 font-medium';
  const variantStyles = {
    primary: 'bg-pink-500 dark:bg-pink-700 text-white hover:bg-pink-600 dark:hover:bg-pink-800',
    secondary:
      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-pink-200 dark:hover:bg-pink-800/50',
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
        focus:outline-none focus:ring-2 focus:ring-pink-400 dark:focus:ring-pink-500 
        focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
        before:absolute before:-inset-0.5 before:rounded-full before:bg-gradient-to-r 
        before:from-pink-200/0 before:to-purple-200/0 before:opacity-0 
        before:transition-opacity group-hover:before:opacity-100
      `}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
