import { useState, useRef, useEffect } from 'react';
import { Text } from "@/components/retroui/Text";

export function RetroSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select option...", 
  disabled = false,
  className = "",
  children,
  options = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const selectRef = useRef(null);

  // Find selected option label
  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    setSelectedLabel(selectedOption ? selectedOption.label : "");
  }, [value, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue) => {
    onValueChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-2 
          border-2 border-border shadow-retro-md bg-input text-foreground
          hover:shadow-retro-sm hover:translate-y-0.5 
          focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-none
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed hover:shadow-retro-md hover:translate-y-0' : 'cursor-pointer'}
        `}
      >
        <span className={`truncate ${!selectedLabel ? 'text-muted-foreground' : ''}`}>
          {selectedLabel || placeholder}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2} 
          stroke="currentColor" 
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border-2 border-border shadow-retro-lg bg-background">
          <div className="max-h-60 overflow-y-auto">
            {options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full text-left px-4 py-2 hover:bg-primary hover:text-primary-foreground
                    transition-colors duration-200 border-b border-border last:border-b-0
                    ${option.disabled ? 'opacity-50 cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}
                    ${value === option.value ? 'bg-accent text-accent-foreground' : ''}
                  `}
                >
                  <Text className="truncate">{option.label}</Text>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-muted-foreground">
                <Text>No options available</Text>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}