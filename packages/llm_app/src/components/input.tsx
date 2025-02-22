interface KawaiiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const KawaiiInput = ({ label, error, className = '', ...props }: KawaiiInputProps) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className={`
            w-full px-4 py-2 rounded-full
            border-2 border-pink-200 dark:border-pink-700
            bg-white dark:bg-gray-900
            text-gray-700 dark:text-gray-300
            placeholder:text-gray-400 dark:placeholder:text-gray-600
            transition-all duration-200
            focus:outline-none focus:border-pink-400 dark:focus:border-pink-500
            focus:ring-2 focus:ring-pink-400/50 dark:focus:ring-pink-500/50
            focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
            ${error ? 'border-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-500/50 dark:to-purple-500/50 rounded-full opacity-0 group-focus-within:opacity-75 blur-sm -z-10" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
