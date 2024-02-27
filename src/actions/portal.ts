import { style } from '../styles/index.js';

export type PortalOptions = {
  target: string | HTMLElement;
  anchor?: boolean;
  change: (e: CustomEvent) => void;
};

export function portal(element: HTMLElement, options: PortalOptions) {
  let { anchor } = options;

  let target = typeof options.target === 'string' ? document.querySelector(options.target) : options.target;

  if (!target) {
    throw new Error(`[portal] Target element not found.`);
  }

  const parent = element.parentElement;
  target.appendChild(element);

  let observer: ResizeObserver | void;

  const dispatch = () => {
    const { top, left, width, height } = element.getBoundingClientRect();
    const event = new CustomEvent('portal-change', {
      detail: { top, left, width, height, target },
    });

    if (typeof options.change === 'function') {
      options.change(event);
    }

    element.dispatchEvent(event);
  };
  const placeAnchor = () => {
    const { width = 0, height = 0, left = 0, top = 0 } = parent?.getBoundingClientRect() || {};

    style(element, {
      left, top,
      position: 'fixed',
      width: width || '100%',
      height: height || '100%',
    });

    dispatch();
  };

  if (anchor) {
    observer = new ResizeObserver(() => {
      placeAnchor();
    });

    observer.observe(parent as HTMLElement);
    placeAnchor();
  }

  return {
    update: (newOptions: PortalOptions) => {
      anchor = newOptions.anchor ?? anchor;

      if (newOptions.target !== options.target) {
        options.target = newOptions.target;
        target = typeof options.target === 'string' ? document.querySelector(options.target) : options.target;
        target?.appendChild(element);
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
