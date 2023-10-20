import { useEffect, useRef } from '../hook/index.js';

export type Unsubscribe = () => void;
export type Subscriber<E> = (e: E) => void;
export type Updater<T> = (newOptions?: T) => void;
export type Destroyer = () => void;
export type Action<T, E> = {
  update: Updater<T>;
  destroy: Destroyer;
  subscribe: (callback: Subscriber<E>) => Unsubscribe;
}
export type Initializer<T, E> = (element: HTMLElement, options?: T) => Action<T, E>;
export type Composer<N extends string, T, E> = {
  [K in N]: (element: HTMLElement, options?: T) => void;
} & {
  capture: (element: HTMLElement, options?: T) => void;
  update: Updater<T>;
  destroy: Destroyer;
  subscribe: (callback: Subscriber<E>) => Unsubscribe;
  on: (type: string, callback: Subscriber<E>) => Unsubscribe;
}

export function createComposer<N extends string, T, E>(
  name: N,
  initializer: Initializer<T, E>,
  init?: T,
): Composer<N, T, E> {
  const subscribers = new Set<Subscriber<E>>();
  const subscriptions = new Map<Subscriber<E>, () => void>();

  let client: Action<T, E> | undefined;

  return {
    [name]: (element: HTMLElement, options?: T) => {
      client?.destroy();
      client = initializer(element, options ?? init);

      for (const callback of subscribers) {
        subscriptions.set(callback, client.subscribe(callback));
      }
    },
    capture: (element: HTMLElement, options?: T) => {
      client?.destroy();
      client = initializer(element, options ?? init);

      for (const callback of subscribers) {
        subscriptions.set(callback, client.subscribe(callback));
      }
    },
    update(newOptions?: T) {
      client?.update(newOptions);
    },
    destroy() {
      client?.destroy();
      subscribers.clear();
      subscriptions.clear();
    },
    subscribe(callback: Subscriber<E>) {
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
    on(type: string, callback: Subscriber<E>) {
      return this.subscribe((e) => {
        if (e instanceof CustomEvent && e.type === type) {
          callback(e);
        }
      });
    },
  } as Composer<N, T, E>;
}

export type ComposerRef = { current?: HTMLElement };
export type ComposerHook<N extends string, T, E> = [ ComposerRef, Composer<N, T, E>['update'], Composer<N, T, E>['destroy'], Composer<N, T, E>['subscribe'], Composer<N, T, E> ];

export function createHook<N extends string, T, E>(
  name: N,
  initializer: Initializer<T, E>,
  init?: T,
): ComposerHook<N, T, E> {
  const target = useRef<HTMLElement>();
  const client = createComposer(name, initializer, init);

  const ref = {
    set current(element: HTMLElement) {
      if (element && element !== target.current) {
        target.current = element;
        client[name](element);
      } else if (!element) {
        client.destroy();
      }
    },
    get current(): HTMLElement | undefined {
      return target.current;
    },
  };

  useEffect(() => {
    return () => client.destroy();
  }, [ ref ]);

  return [ ref, client.update, client.destroy, client.subscribe, client ] as never;
}
