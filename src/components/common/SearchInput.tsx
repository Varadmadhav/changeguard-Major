import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Filter or search...',
  className,
  autoFocus = false,
}) => {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-input border border-slate-300 pl-8 pr-7 py-1.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
