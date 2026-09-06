/**
 * Global keyboard shortcuts.
 *
 * Bindings are data, not branching logic: the default keymap below can be
 * replaced wholesale by the caller, and the matcher is a pure function so the
 * behaviour is unit-testable without a DOM.
 */
import { useEffect } from 'react';

export type ShortcutAction = 'new_issue' | 'auto_cluster' | 'close_modal';

export interface ShortcutBinding {
  /** Lowercase `KeyboardEvent.key` value. */
  key: string;
  action: ShortcutAction;
  description: string;
  /** Fires even while the user is typing in an input/textarea. */
  allowWhileTyping: boolean;
  /** Fires even while a modal is open (others are suppressed). */
  allowWhileModalOpen: boolean;
}

export const DEFAULT_SHORTCUTS: readonly ShortcutBinding[] = [
  {
    key: 'n',
    action: 'new_issue',
    description: 'Create a new issue',
    allowWhileTyping: false,
    allowWhileModalOpen: false,
  },
  {
    key: 'c',
    action: 'auto_cluster',
    description: 'Run AI auto-clustering',
    allowWhileTyping: false,
    allowWhileModalOpen: false,
  },
  {
    key: 'escape',
    action: 'close_modal',
    description: 'Close the open modal or form',
    allowWhileTyping: true,
    allowWhileModalOpen: true,
  },
] as const;

/** Structural shape of the parts of a KeyboardEvent the matcher reads. */
export interface ShortcutEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: unknown;
}

interface EditableTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

/**
 * True when the event originated in a text-entry surface, so plain letter
 * shortcuts must not steal the keystroke.
 */
export function isTypingTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;

  const element = target as EditableTargetLike;
  if (element.isContentEditable === true) return true;

  const tag = element.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export interface ShortcutContext {
  isModalOpen: boolean;
}

/**
 * Resolve a keyboard event to a binding, or null when nothing should fire.
 * Modifier chords are ignored so browser/OS shortcuts are never hijacked.
 */
export function resolveShortcut(
  event: ShortcutEventLike,
  bindings: readonly ShortcutBinding[],
  context: ShortcutContext
): ShortcutBinding | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const key = event.key?.toLowerCase();
  if (!key) return null;

  const binding = bindings.find((b) => b.key === key);
  if (!binding) return null;

  if (context.isModalOpen && !binding.allowWhileModalOpen) return null;
  if (isTypingTarget(event.target) && !binding.allowWhileTyping) return null;

  return binding;
}

export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>;

export interface UseKeyboardShortcutsOptions {
  isModalOpen?: boolean;
  enabled?: boolean;
  bindings?: readonly ShortcutBinding[];
}

/**
 * Attach the keymap to the document for as long as the component is mounted.
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { isModalOpen = false, enabled = true, bindings = DEFAULT_SHORTCUTS } = options;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      const binding = resolveShortcut(event, bindings, { isModalOpen });
      if (!binding) return;

      const handler = handlers[binding.action];
      if (!handler) return;

      event.preventDefault();
      handler();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handlers, bindings, isModalOpen, enabled]);
}
