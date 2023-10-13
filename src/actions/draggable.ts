import { logger } from '@beerush/utils';
import { useEffect, useRef } from '../hook/index.js';
import { Mouse } from '../utils/mouse.js';

export type DraggableAxis = 'x' | 'y' | 'all';
export type DraggableOptions = {
  move?: boolean;
  axis?: DraggableAxis;
  lockAxisKey?: DraggableKey;
  lockRatioKey?: DraggableKey;
  translate?: boolean;
  button?: Mouse;
  draggable?: boolean;
  deltaScale?: number;
  resetEnd?: boolean;
  resetEffect?: boolean;
}

export enum DraggableEventType {
  Start = 'drag-start',
  Move = 'drag-move',
  End = 'drag-end',
}

export enum DraggableKey {
  Shift = 'shiftKey',
  Alt = 'altKey',
  Ctrl = 'ctrlKey',
  Meta = 'metaKey',
}

export const DragWith = {
  Move: { move: true } as DraggableOptions,
  Translate: { translate: true } as DraggableOptions,
  ElasticMove: { move: true, resetEnd: true } as DraggableOptions,
  ElasticTranslate: { translate: true, resetEnd: true } as DraggableOptions,
  Middle: { button: Mouse.Middle } as DraggableOptions,
  MiddleMove: { button: Mouse.Middle, move: true } as DraggableOptions,
  MiddleTranslate: { button: Mouse.Middle, translate: true } as DraggableOptions,
  Right: { button: Mouse.Right } as DraggableOptions,
  RightMove: { button: Mouse.Right, move: true } as DraggableOptions,
  RightTranslate: { button: Mouse.Right, translate: true } as DraggableOptions,
  Horizontal: { axis: 'x', translate: true } as DraggableOptions,
  Vertical: { axis: 'y', translate: true } as DraggableOptions,
};

export type DraggableEventDetail = {
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  startWidth: number;
  startHeight: number;
  axisLock: DraggableAxis;
}

export type DraggableEvent = CustomEvent<DraggableEventDetail>;
export type Draggable = {
  update: (options?: DraggableOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: DraggableEvent) => void) => () => void;
}

export function draggable(element: HTMLElement, options: DraggableOptions = {}): Draggable {
  let {
    axis = 'all',
    lockAxisKey = DraggableKey.Shift,
    lockRatioKey = DraggableKey.Alt,
    deltaScale = 1,
    button = Mouse.Left,
    draggable = true,
    move = false,
    translate = false,
    resetEnd = true,
    resetEffect = true,
  } = options;

  let startX = 0; // Pointer Start X.
  let startY = 0; // Pointer Start Y.
  let deltaX = 0; // Pointer Current X.
  let deltaY = 0; // Pointer Current Y.
  let startLeft = 0; // Element Start Left.
  let startTop = 0; // Element Start Top.
  let startWidth = 0; // Scale Start Width.
  let startHeight = 0; // Scale Start Height.
  let dragInit = false;
  let dragging = false;
  let position = '';
  let axisLock: DraggableAxis = 'all';

  let initEvent: DraggableEvent;

  const subscribers = new Set<(e: DraggableEvent) => void>();
  const createEvent = (type: DraggableEventType) => {
    return new CustomEvent(type, {
      detail: { startX, startY, deltaX, deltaY, startWidth, startHeight, axisLock },
      cancelable: true,
      bubbles: true,
      composed: true,
    });
  };
  const dispatch = (event: DraggableEventType | DraggableEvent) => {
    element.dispatchEvent(typeof event === 'string' ? createEvent(event) : event);
  };

  const dragStart = (e: MouseEvent) => {
    if (!draggable) return;
    if (e instanceof MouseEvent && e.button !== button) return;
    if (!element.contains(e.target as never)) return;

    const { left, top, width, height } = element.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    deltaX = 0;
    deltaY = 0;
    startLeft = left;
    startTop = top;
    startWidth = width;
    startHeight = height;

    initEvent = createEvent(DraggableEventType.Start);
    dragInit = true;
  };

  const dragMove = (e: MouseEvent) => {
    if (!draggable) return;
    if (!dragInit) return;
    if (!dragging) {
      if (move) {
        position = getComputedStyle(element).position;
      }

      axisLock = axis;
      dragging = true;
      dispatch(initEvent);
      logger.debug(`[draggable] Drag started.`);
    }

    if (!dragging) return;

    const x = ((e.clientX - startX) / deltaScale);
    const y = ((e.clientY - startY) / deltaScale);

    if (deltaX !== x || deltaY !== y) {
      if (e[lockAxisKey]) {
        axisLock = Math.abs(x) > Math.abs(y) ? 'x' : 'y';
      } else if (axisLock !== 'all') {
        axisLock = 'all';
      }

      if ([ 'x', 'all' ].includes(axisLock)) {
        deltaX = x;
      }

      if ([ 'y', 'all' ].includes(axisLock)) {
        deltaY = y;
      }

      if (e[lockRatioKey]) {
        deltaY = deltaX as never;
      }

      if (move && ![ 'relative', 'absolute', 'fixed' ].includes(position)) {
        position = 'absolute';
        element.style.position = position;
      }

      if (move) {
        element.style.left = `${ startLeft + deltaX }px`;
        element.style.top = `${ startTop + deltaY }px`;
      } else if (translate) {
        element.style.transform = `translate3d(${ deltaX }px, ${ deltaY }px, 0)`;
      }

      dispatch(DraggableEventType.Move);
    }
  };

  const dragEnd = (e: MouseEvent) => {
    if (!draggable) return;
    if (e instanceof MouseEvent && e.button !== button) return;
    if (!dragInit) return;

    if (dragInit && !dragging) {
      dragInit = false;
      return;
    }

    if (resetEnd) {
      if (move) {
        element.style.removeProperty('position');
        element.style.removeProperty('left');
        element.style.removeProperty('top');
      } else if (translate) {
        element.style.removeProperty('transform');
      }
    }

    dispatch(DraggableEventType.End);

    dragInit = false;
    dragging = false;

    logger.debug(`[draggable] Drag completed by (${ deltaX }px, ${ deltaY }px).`);
  };

  let touch: Touch | undefined;
  const touchStart = (e: TouchEvent) => {
    if (button === 1 && e.touches.length === 2) {
      const [ firstTouch, secondTouch ] = (e.touches as never) as Touch[];

      const xDistance = Math.abs(firstTouch.clientX - secondTouch.clientX);
      const yDistance = Math.abs(firstTouch.clientY - secondTouch.clientY);

      if (xDistance < 100 && yDistance < 100) {
        touch = firstTouch;
        assignTouchEvent(e);
        dragStart(touch as never);
      }
    } else if (button === 0 && e.touches.length === 1) {
      touch = e.touches[0];
      assignTouchEvent(e);
      dragStart(touch as never);
    }
  };

  const touchMove = (e: TouchEvent) => {
    if ((button === 0 && e.touches.length === 1) || (button === 1 && e.touches.length === 2)) {
      e.preventDefault();
      e.stopPropagation();

      touch = e.touches[0];
      assignTouchEvent(e);
      dragMove(touch as never);
    }
  };

  const touchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0 && touch) {
      assignTouchEvent(e);
      dragEnd(touch as never);
      touch = undefined;
    }
  };

  const assignTouchEvent = (e: TouchEvent) => {
    if (touch) {
      Object.assign(touch, {
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      });
    }
  };

  const register = () => {
    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);

    element.addEventListener('touchstart', touchStart, { passive: false });
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd, { passive: false });

    logger.debug(`[draggable] Drag registered.`);
  };

  const unregister = () => {
    element.removeEventListener('mousedown', dragStart);
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);

    element.removeEventListener('touchstart', touchStart);
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);

    logger.debug(`[draggable] Drag destroyed.`);
  };

  if (draggable) {
    register();
  }

  return {
    update: (opt?: DraggableOptions) => {
      logger.debug(`[draggable] Drag reconfigure.`);

      if (opt?.draggable !== draggable) {
        unregister();

        draggable = opt?.draggable ?? draggable;

        if (draggable) {
          register();
        }
      }

      axis = opt?.axis ?? axis;
      lockAxisKey = opt?.lockAxisKey ?? lockAxisKey;
      lockRatioKey = opt?.lockRatioKey ?? lockRatioKey;
      move = opt?.move ?? move;
      translate = opt?.translate ?? translate;
      button = opt?.button ?? button;
      deltaScale = opt?.deltaScale ?? deltaScale;
      resetEnd = opt?.resetEnd ?? resetEnd;
      resetEffect = opt?.resetEffect ?? resetEffect;
    },
    destroy: () => {
      for (const callback of subscribers) {
        element.removeEventListener(DraggableEventType.Start as never, callback);
        element.removeEventListener(DraggableEventType.Move as never, callback);
        element.removeEventListener(DraggableEventType.End as never, callback);
      }

      subscribers.clear();
      unregister();
    },
    subscribe: (callback: (e: DraggableEvent) => void) => {
      subscribers.add(callback);
      element.addEventListener(DraggableEventType.Start as never, callback);
      element.addEventListener(DraggableEventType.Move as never, callback);
      element.addEventListener(DraggableEventType.End as never, callback);

      return () => {
        subscribers.delete(callback);
        element.removeEventListener(DraggableEventType.Start as never, callback);
        element.removeEventListener(DraggableEventType.Move as never, callback);
        element.removeEventListener(DraggableEventType.End as never, callback);
      };
    },
  };
}

export type DraggableUpdater = (opt?: DraggableOptions) => void;
export type DraggableDestroyer = () => void;
export type DraggableFactory = {
  drag: (element: HTMLElement) => void;
  update: DraggableUpdater;
  destroy: DraggableDestroyer;
  subscribe: (callback: (e: DraggableEvent) => void) => () => void;
};

export function createDraggable(init?: DraggableOptions): DraggableFactory {
  const subscribers = new Set<(e: DraggableEvent) => void>();
  const subscriptions = new Map<(e: DraggableEvent) => void, () => void>();

  let client: Draggable | undefined;

  return {
    drag: (element: HTMLElement, options?: DraggableOptions) => {
      client?.destroy();
      client = draggable(element, options ?? init);

      for (const callback of subscribers) {
        subscriptions.set(callback, client.subscribe(callback));
      }
    },
    update: (newOptions?: DraggableOptions) => {
      client?.update(newOptions);
    },
    destroy: () => {
      client?.destroy();
      subscribers.clear();
      subscriptions.clear();
    },
    subscribe: (callback: (e: DraggableEvent) => void) => {
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

export type DragRef = {
  current?: HTMLElement;
};

export function useDraggable(options?: DraggableOptions): [ DragRef, DraggableUpdater, DraggableDestroyer, DraggableFactory ] {
  const target = useRef<HTMLElement>();
  const client = createDraggable(options);

  const ref = {
    set current(element: HTMLElement | undefined) {
      if (element && target.current !== element) {
        target.current = element;
        client.drag(element);
      } else if (!element) {
        client.destroy();
      }
    },
    get current(): HTMLElement | undefined {
      return target.current;
    },
  };

  useEffect(() => {
    return () => {
      client?.destroy();
    };
  }, []);

  return [ ref, client.update, client.destroy, client ];
}
