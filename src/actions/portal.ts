import { style } from '../styles/index.js';

export type PortalOptions = {
  target: string | HTMLElement;
  anchor?: boolean;
};

export function portal(element: HTMLElement, options: PortalOptions) {
  let { anchor } = options;

  const target = typeof options.target === 'string' ? document.querySelector(options.target) : options.target;

  if (!target) {
    throw new Error(`[portal] Target element not found.`);
  }

  const parent = element.parentElement;
  target.appendChild(element);

  let observer: ResizeObserver | void;

  if (anchor) {
    observer = new ResizeObserver(() => {
      placeAnchor();
    });

    observer.observe(parent as HTMLElement);
  }

  const placeAnchor = () => {
    const { width = 0, height = 0, left = 0, top = 0 } = parent?.getBoundingClientRect() || {};

    style(element, {
      left, top,
      position: 'fixed',
      width: width || '100%',
      height: height || '100%',
    });
  };

  return {
    update: (newOptions: PortalOptions) => {
      anchor = newOptions.anchor ?? anchor;

      if (newOptions.target !== options.target) {
        target.appendChild(element);
        placeAnchor();
      }

      options = newOptions;
    },
    destroy: () => {
      observer?.disconnect();
      element.remove();
    },
  };
}
