import { createComposer, createHook } from '../core/index.js';

export type EscapeEvent = CustomEvent<KeyboardEvent | MouseEvent>;
export type EscapeOptions = {
  escKey?: boolean;
  outsideClick?: boolean;
};
export type Escaper = {
  update: (options?: EscapeOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: EscapeEvent) => void) => () => void;
};

export function escape(element: HTMLElement, { escKey = true, outsideClick = true }: EscapeOptions = {}): Escaper {
  const subscribers = new Set<(e: EscapeEvent) => void>();
  const createEvent = (e: KeyboardEvent | MouseEvent) => new CustomEvent<KeyboardEvent | MouseEvent>('escape', {
    detail: e,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  const dispatch = (e: EscapeEvent) => {
    element.dispatchEvent(e);
  };

  const listener = (e: KeyboardEvent | MouseEvent) => {
    if (e instanceof MouseEvent && outsideClick) {
      if (e.button === 0 && element.contains(e.target as Node)) {
        const event = createEvent(e);
        dispatch(event);
      }
    } else if (e instanceof KeyboardEvent && escKey) {
      if (e.key === 'Escape') {
        const event = createEvent(e);
        dispatch(event);
      }
    }
  };

  document.addEventListener('keyup', listener);
  document.addEventListener('mouseup', listener);

  return {
    update: (options?: EscapeOptions) => {
      escKey = options?.escKey ?? escKey;
      outsideClick = options?.outsideClick ?? outsideClick;
    },
    destroy: () => {
      for (const callback of subscribers) {
        element.removeEventListener('escape' as never, callback);
      }

      subscribers.clear();
      document.removeEventListener('keyup', listener);
      document.removeEventListener('mouseup', listener);
    },
    subscribe: (callback: (e: EscapeEvent) => void) => {
      subscribers.add(callback);
      element.addEventListener('escape' as never, callback);

      return () => {
        subscribers.delete(callback);
        element.removeEventListener('escape' as never, callback);
      };
    },
  };
}

export type EscaperFactory = {
  escape: (element: HTMLElement, options?: EscapeOptions) => void;
  update: (newOptions?: EscapeOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: EscapeEvent) => void) => () => void;
}

export function createEscaper(init?: EscapeOptions) {
  return createComposer('escape', escape, init);
}

export type EscaperRef = {
  current?: HTMLElement;
};

export function useEscape(init?: EscapeOptions) {
  return createHook('escape', escape, init);
}
