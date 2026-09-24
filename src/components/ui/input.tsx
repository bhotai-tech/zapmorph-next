'use client';

import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const fieldClasses =
  'h-11 w-full rounded-lg border border-border bg-surface text-sm text-foreground ' +
  'placeholder:text-muted transition-shadow duration-150 ' +
  'focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring';

export function Input({ className = '', type, ...props }: ComponentProps<'input'>) {
  // Emails and free-text confirmations shouldn't be capitalised or autocorrected by mobile keyboards.
  const raw = type === 'email' || props.autoComplete === 'off';
  return (
    <input
      type={type}
      {...(raw ? { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } : {})}
      className={`${fieldClasses} px-3 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={`${fieldClasses.replace('h-11 ', '')} min-h-32 resize-y px-3 py-2.5 leading-6 ${className}`}
      {...props}
    />
  );
}

export function PasswordInput({ className = '', ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${fieldClasses} pr-11 pl-3 ${className}`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Label({ className = '', ...props }: ComponentProps<'label'>) {
  return <label className={`mb-1.5 block text-sm font-medium ${className}`} {...props} />;
}
