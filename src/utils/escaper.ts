import { useEffect, useRef } from '../hook/index.js';

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

export function createEscaper(init?: EscapeOptions): EscaperFactory {
  const subscribers = new Set<(e: EscapeEvent) => void>();
  const subscriptions = new Map<(e: EscapeEvent) => void, () => void>();

  let client: Escaper;

  return {
    escape: (element: HTMLElement, options?: EscapeOptions) => {
      client = escape(element, options ?? init);

      for (const callback of subscribers) {
        subscriptions.set(callback, client.subscribe(callback));
      }
    },
    update: (newOptions?: EscapeOptions) => {
      client?.update(newOptions);
    },
    destroy: () => {
      client?.destroy();
      subscribers.clear();
      subscriptions.clear();
    },
    subscribe: (callback: (e: EscapeEvent) => void) => {
      subscribers.add(callback);

      if (client) {
        subscriptions.set(callback, client.subscribe(callback));
      }

      return () => {
        subscribers.delete(callback);
        subscriptions.get(callback)?.();
        subscriptions.delete(callback);
      };
    },
  };
}

export type EscaperRef = {
  current?: HTMLElement;
};

export function useEscape(init?: EscapeOptions): [ EscaperRef, Escaper['update'], Escaper['destroy'], Escaper['subscribe'], Escaper ] {
  const target = useRef<HTMLElement>();
  const client = createEscaper(init);

  const ref = {
    get current(): HTMLElement | undefined {
      return target.current;
    },
    set current(element: HTMLElement | undefined) {
      if (element && element !== target.current) {
        target.current = element;
        client.escape(element);
      } else {
        client.destroy();
      }
    },
  };

  useEffect(() => {
    return () => {
      client.destroy();
    };
  }, [ ref ]);

  return [ ref, client.update, client.destroy, client.subscribe, client ];
}
