import React, { KeyboardEvent, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { parseTags } from './productFormUtils';

interface TagEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TagEditor: React.FC<TagEditorProps> = ({ value, onChange, disabled }) => {
  const [input, setInput] = useState('');
  const tags = useMemo(() => parseTags(value), [value]);

  const commitTag = () => {
    const nextTag = input.trim();
    if (!nextTag) return;

    const nextTags = tags.includes(nextTag) ? tags : [...tags, nextTag];
    onChange(nextTags.join(', '));
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((item) => item !== tag).join(', '));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTag();
    }

    if (event.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 transition focus-within:border-primary-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/20">
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="rounded-full text-gray-400 transition hover:text-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              aria-label={`Eliminar etiqueta ${tag}`}
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitTag}
          disabled={disabled}
          className="min-w-[9rem] flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          placeholder={tags.length ? 'Agregar otra etiqueta' : 'oferta, nuevo, popular'}
          aria-label="Agregar etiqueta"
        />
      </div>
    </div>
  );
};
