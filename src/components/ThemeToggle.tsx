'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'theme';

/**
 * The "store" is the `.dark` class on <html>. The initial class is set
 * by an inline script in the root layout before first paint; this
 * subscription reads it back and re-renders after hydration without a
 * server/client mismatch (useSyncExternalStore tolerates the server
 * snapshot differing from the client snapshot).
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Light/dark toggle.
 *
 * Light is always the default; `.dark` is applied only after the user
 * opts in (their choice persists in localStorage). The navigation
 * stays plain links and works fully without JavaScript (AC-12) — this
 * toggle is a progressive enhancement only.
 */
export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const dark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = () => {
    const next = !getSnapshot();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Storage unavailable (private mode etc.) — the toggle still
      // works for the current page, it just will not persist.
    }
    listeners.forEach((listener) => listener());
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
        onDark
          ? 'border-white/25 text-white/80 hover:border-accent hover:text-white'
          : 'border-line text-muted hover:border-accent hover:text-accent'
      }`}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
      <line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="19.1" x2="6.3" y2="17.7" />
      <line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  );
}
