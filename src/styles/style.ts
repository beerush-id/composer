import type { Readable, Unsubscribe } from '@beerush/anchor';
import { entries } from '@beerush/utils';
import { type CSSProperties, toCssUnit } from './css.js';
import { useEffect, useRef } from '../hook/index.js';

export type StyleDeclarations = CSSProperties | Readable<CSSProperties>;
export type StylerOptions = {
  styles: StyleDeclarations;
  deltaScale?: number;
  reset?: boolean;
};

export type Styler = {
  update: (options: StylerOptions | StyleDeclarations) => void;
  destroy: () => void;
};

/**
 * Apply CSS Style Declarations to the given element.
 * @param {HTMLElement} element - HTML Element to apply the styles to.
 * @param {StylerOptions | StyleDeclarations} options - Styler Options or CSS Properties.
 * @returns {Styler} - Style Instance.
 */
export function style(element: HTMLElement, options: StylerOptions | StyleDeclarations): Styler {
  let { reset = false, deltaScale = 1 } = options as never;
  let styles = (options as StylerOptions).styles ?? options;

  styleElement(element, styles, reset, deltaScale);

  let unsubscribe: Unsubscribe;
  if ('subscribe' in styles) {
    unsubscribe = styles.subscribe(() => {
      styleElement(element, styles, reset, deltaScale);
    });
  }

  return {
    update: (newOptions: StylerOptions | StyleDeclarations) => {
      unsubscribe?.();

      reset = (newOptions as StylerOptions).reset ?? reset;
      deltaScale = (newOptions as StylerOptions).deltaScale ?? deltaScale;
      styles = (newOptions as StylerOptions).styles ?? newOptions;

      styleElement(element, styles, reset, deltaScale);

      if ('subscribe' in styles) {
        unsubscribe = styles.subscribe(() => {
          styleElement(element, styles, reset, deltaScale);
        });
      }
    },
    destroy: () => {
      unsubscribe?.();

      if (reset) {
        styleElement(element, {}, true);
      }
    },
  };
}

export type StylerFactory = {
  style: (element: HTMLElement, options: StylerOptions | StyleDeclarations) => void;
  update: (options: StylerOptions) => void;
  destroy: () => void;
};

export function createStyler(init: StylerOptions | StyleDeclarations): StylerFactory {
  let client: Styler;

  return {
    style: (element: HTMLElement, options: StylerOptions | StyleDeclarations) => {
      client = style(element, options ?? init);
    },
    update: (newOptions: StylerOptions | StyleDeclarations) => {
      client?.update(newOptions);
    },
    destroy: () => {
      client?.destroy();
    },
  };
}

export type StylerRef = {
  current?: HTMLElement;
}

export function useStyle(options: StylerOptions | StyleDeclarations): [ StylerRef, StylerFactory['update'], StylerFactory['destroy'] ] {
  const target = useRef<HTMLElement>();
  const client = createStyler(options);

  const ref = {
    get current(): HTMLElement | undefined {
      return target.current;
    },
    set current(element: HTMLElement) {
      if (element && element !== target.current) {
        target.current = element;
        client.style(element, options);
      } else {
        target.current = element;
        client.destroy();
      }
    },
  };

  useEffect(() => {
    return () => {
      client.destroy();
    };
  }, [ ref ]);

  return [ ref, client.update, client.destroy ];
}

/**
 * Apply CSS Style Declarations to the given element.
 * @param {HTMLElement} element
 * @param {CSSProperties} styles
 * @param {boolean} reset
 * @param {number} deltaScale
 */
export function styleElement(element: HTMLElement, styles: CSSProperties, reset?: boolean, deltaScale = 1) {
  if (reset) {
    element.removeAttribute('style');
  }

  for (const [ key, value ] of entries(styles)) {
    if (typeof value !== 'undefined' && value !== null) {
      const val: string = toCssUnit(key, value, deltaScale);

      if ((key as string).includes('-')) {
        element.style.setProperty(key as string, val);
      } else {
        element.style[key as never] = val;
      }
    }
  }
}
