"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Prediction = { place_id: string; description: string };

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  label?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  id,
  label,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      if (res.ok) {
        const data = await res.json();
        setPredictions(data);
        setIsOpen(true);
      }
    } catch {
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  }, [onChange, fetchPredictions]);

  const handleSelect = useCallback((prediction: Prediction) => {
    setQuery(prediction.description);
    onChange(prediction.description);
    setIsOpen(false);
    setPredictions([]);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setPredictions([]);
    }
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inputId = id || `address-input-${label?.toLowerCase().replace(/\s+/g, "-") || ""}`;

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <input
        ref={inputRef}
        id={inputId}
        autoComplete="off"
        className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (query.length >= 3 && predictions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={`${inputId}-listbox`}
        role="combobox"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600"></span>
        </div>
      )}
      {isOpen && predictions.length > 0 && (
        <ul
          id={`${inputId}-listbox`}
          className="absolute z-10 mt-1 w-full rounded border border-stone-200 bg-white shadow-lg max-h-48 overflow-y-auto"
          role="listbox"
        >
          {predictions.map((prediction) => (
            <li
              key={prediction.place_id}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-stone-50"
              role="option"
              onClick={() => handleSelect(prediction)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {prediction.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}