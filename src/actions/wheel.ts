import { createComposer, createHook } from '../core/index.js';
import { logger } from '@beerush/utils';

export type WheelOptions = {
  deltaMove?: number;
  deltaScale?: number;
  deltaPinchMin?: number;
  deltaPinchMax?: number;
  zoomAlt?: boolean;
  natural?: boolean;
};
export type WheelChange = CustomEvent<number>;
export type Wheel = {
  update: (options?: WheelOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: WheelChange) => void) => () => void;
};

export enum WheelChangeType {
  ZoomIn = 'zoom-in',
  ZoomOut = 'zoom-out',
  PinchStart = 'pinch-start',
  Pinch = 'pinch',
  PinchEnd = 'pinch-end',
  MoveUp = 'move-up',
  MoveDown = 'move-down',
  MoveLeft = 'move-left',
  MoveRight = 'move-right',
}

export function wheel(element: HTMLElement, options?: WheelOptions): Wheel {
  let { zoomAlt = true, deltaScale = 0.1, deltaPinchMin = 125, deltaMove = 20, natural = false } = options || {} as WheelOptions;
  const subscribers = new Set<(e: WheelChange) => void>();

  let top: Touch | undefined;
  let bottom: Touch | undefined;
  let startTop = 0;
  let startBottom = 0;
  let startDiff = 0;
  let deltaZoom = 0;
  let zooming = false;

  const dispatch = (type: WheelChangeType, value: number) => {
    const e = new CustomEvent(type, {
      detail: value,
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    for (const callback of subscribers) {
      callback(e);
    }

    element.dispatchEvent(e);
  };

  const mousewheel = (e: WheelEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      const type = (natural ? e.deltaY < 0 : e.deltaY > -1) ? WheelChangeType.MoveLeft : WheelChangeType.MoveRight;
      dispatch(type, deltaMove);
      return;
    }

    if ((zoomAlt && !e.altKey) || (!zoomAlt && e.altKey)) {
      e.preventDefault();
      e.stopPropagation();

      const type = (natural ? e.deltaY < 0 : e.deltaY > -1) ? WheelChangeType.MoveUp : WheelChangeType.MoveDown;
      dispatch(type, deltaMove);
      return;
    }

    if ((zoomAlt && e.altKey) || !zoomAlt) {
      e.preventDefault();
      e.stopPropagation();

      const type = (natural ? e.deltaY < 0 : e.deltaY > -1) ? WheelChangeType.ZoomOut : WheelChangeType.ZoomIn;
      dispatch(type, deltaScale);
      return;
    }
  };

  const touchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const [ t1, t2 ] = (e.touches as never) as [ Touch, Touch ];

      top = t1.clientY < t2.clientY ? t1 : t2;
      bottom = top === t1 ? t2 : t1;

      startTop = top.clientY;
      startBottom = bottom.clientY;
      startDiff = Math.abs(startBottom - startTop);
    }
  };
  const touchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && startDiff > deltaPinchMin) {
      if (!zooming) {
        zooming = true;
        dispatch(WheelChangeType.PinchStart, 0);
        logger.debug('[wheel:pinch] Pinch zoom started.');
      }

      if (!zooming) return;

      e.stopPropagation();
      e.preventDefault();

      const [ t1, t2 ] = (e.touches as never) as [ Touch, Touch ];
      const nextTop = t1.identifier === top?.identifier ? t1 : t2;
      const nextBottom = t2.identifier === bottom?.identifier ? t2 : t1;

      const topDelta = startTop - nextTop.clientY;
      const bottomDelta = nextBottom.clientY - startBottom;

      const delta = topDelta - bottomDelta;
      deltaZoom = (delta / 200);

      dispatch(WheelChangeType.Pinch, deltaZoom);
    }
  };
  const touchEnd = () => {
    if (!zooming) return;

    dispatch(WheelChangeType.PinchEnd, 0);
    logger.debug(`[wheel:pinch] Pinch zoom ended by (${ deltaZoom }).`);

    top = undefined;
    bottom = undefined;
    startDiff = 0;
    zooming = false;
    deltaZoom = 0;
  };

  element.addEventListener('wheel', mousewheel, { passive: false });
  element.addEventListener('touchstart', touchStart, { passive: false });
  element.addEventListener('touchmove', touchMove, { passive: false });
  element.addEventListener('touchend', touchEnd, { passive: false });

  return {
    update: (opt?: WheelOptions) => {
      deltaScale = opt?.deltaScale || deltaScale;
      deltaPinchMin = opt?.deltaPinchMin || deltaPinchMin;
      deltaMove = opt?.deltaMove || deltaMove;
      zoomAlt = opt?.zoomAlt || zoomAlt;
      natural = opt?.natural || natural;
    },
    destroy: () => {
      subscribers.clear();

      element.removeEventListener('wheel', mousewheel);
      element.removeEventListener('touchstart', touchStart);
      element.removeEventListener('touchmove', touchMove);
      element.removeEventListener('touchend', touchEnd);
    },
    subscribe: (callback: (e: WheelChange) => void) => {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

export function createWheel(options?: WheelOptions) {
  return createComposer('wheel', wheel, options);
}

export function useWheel(options?: WheelOptions) {
  return createHook('wheel', wheel, options);
}
