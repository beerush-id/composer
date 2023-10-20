import { logger } from '@beerush/utils';
import { Mouse } from '../utils/mouse.js';
import { createComposer, createHook } from '../core/index.js';

export type DraggableAxis = 'x' | 'y' | 'all';
export type DraggableOptions = {
  name?: string;
  move?: boolean;
  moveOffset?: boolean;
  translate?: boolean;

  step?: number;
  axis?: DraggableAxis;
  lockAxisKey?: DragModifier;
  lockRatioKey?: DragModifier;

  button?: Mouse;
  deltaScale?: number;
  deltaMove?: number;
  deltaTouch?: number;

  draggable?: boolean;
  resetEnd?: boolean;
  resetEffect?: boolean;

  parent?: HTMLElement;
  overlap?: boolean;
  parentTrigger?: boolean;
}

export enum DragChangeType {
  Start = 'drag-start',
  Move = 'drag-move',
  End = 'drag-end',
  MidStart = 'drag-mid-start',
  MidMove = 'drag-mid-move',
  MidEnd = 'drag-mid-end',
}

export enum DragModifier {
  Shift = 'shiftKey',
  Alt = 'altKey',
  Ctrl = 'ctrlKey'
}

export const DragWith = {
  Move: { move: true } satisfies DraggableOptions,
  Translate: { translate: true } satisfies DraggableOptions,
  ElasticMove: { move: true, resetEnd: true } satisfies DraggableOptions,
  ElasticTranslate: { translate: true, resetEnd: true } satisfies DraggableOptions,
  Middle: { button: Mouse.Middle } satisfies DraggableOptions,
  MiddleMove: { button: Mouse.Middle, move: true } satisfies DraggableOptions,
  MiddleTranslate: { button: Mouse.Middle, translate: true } satisfies DraggableOptions,
  Right: { button: Mouse.Right } satisfies DraggableOptions,
  RightMove: { button: Mouse.Right, move: true } satisfies DraggableOptions,
  RightTranslate: { button: Mouse.Right, translate: true } satisfies DraggableOptions,
  Horizontal: { axis: 'x', translate: true } satisfies DraggableOptions,
  Vertical: { axis: 'y', translate: true } satisfies DraggableOptions,
  StayInside: { overlap: false } satisfies DraggableOptions,
  Slider: { overlap: false, parentTrigger: true } satisfies DraggableOptions,
  HorizontalSlider: { overlap: false, axis: 'x', parentTrigger: true } satisfies DraggableOptions,
  VerticalSlider: { overlap: false, axis: 'y', parentTrigger: true } satisfies DraggableOptions,
};

export type DragChangeDetail = {
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
  offsetX: number;
  offsetY: number;
  startWidth: number;
  startHeight: number;
  axisLock: DraggableAxis;
}
export type DragChange = CustomEvent<DragChangeDetail> & {
  button: Mouse;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

export type Draggable = {
  update: (options?: DraggableOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: DragChange) => void) => () => void;
}

export function draggable(element: HTMLElement, options: DraggableOptions = {}): Draggable {
  let {
    button,
    name = 'global',
    move = false,
    moveOffset = false,
    translate = false,

    step = 0,
    axis = 'all',
    lockAxisKey = DragModifier.Shift,
    lockRatioKey = DragModifier.Alt,

    deltaScale = 1,
    deltaMove = 0,
    deltaTouch = 75,

    draggable = true,
    resetEnd = true,
    resetEffect = true,

    parent = element.parentElement,
    overlap = true,
    parentTrigger = false,
  } = options;

  let startX = 0; // Pointer Start X.
  let startY = 0; // Pointer Start Y.
  let clientX = 0; // Pointer Current X.
  let clientY = 0; // Pointer Current Y.
  let deltaX = 0; // Pointer Current X.
  let deltaY = 0; // Pointer Current Y.
  let offsetX = 0; // Element Offset X.
  let offsetY = 0; // Element Offset Y.
  let startWidth = 0; // Scale Start Width.
  let startHeight = 0; // Scale Start Height.
  let parentX = 0; // Element Parent Left.
  let parentY = 0; // Element Parent Top.
  let parentWidth = 0; // Element Parent Width.
  let parentHeight = 0; // Element Parent Height.
  let dragInit = false;
  let dragging = false;
  let position = '';
  let axisLock: DraggableAxis = 'all';
  let withSpace = false;
  let middleDrag = false;

  let initEvent: DragChange;

  const subscribers = new Set<(e: DragChange) => void>();
  const createEvent = (type: DragChangeType) => {
    const detail = {
      startX, startY, clientX, clientY, deltaX, deltaY,
      offsetX, offsetY, startWidth, startHeight, axisLock,
    };

    const event = new CustomEvent(type, {
      detail,
      cancelable: true,
      bubbles: true,
      composed: true,
    });

    Object.assign(event, { button: middleDrag ? Mouse.Middle : Mouse.Left, ...detail });

    return event as DragChange;
  };
  const dispatch = (type: DragChangeType | DragChange) => {
    const event = typeof type === 'string' ? createEvent(type) : type;

    if (button !== undefined && button !== event.button) return;

    element.dispatchEvent(event);
    for (const callback of subscribers) {
      callback(event);
    }
  };

  const dragStart = (e: MouseEvent, fromParent?: boolean) => {
    if (!draggable) return;
    if (!isPressed(e, button, deltaTouch)) return;
    if (!canDrag(e)) return;
    if (!element.contains(e.target as never)) return;

    const { left, top, width, height } = element.getBoundingClientRect();
    const {
      left: pLeft,
      top: pTop,
      width: pWidth,
      height: pHeight,
    } = parent?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };

    startX = fromParent ? left : e.clientX;
    startY = fromParent ? top : e.clientY;
    deltaX = 0;
    deltaY = 0;

    parentX = pLeft;
    parentY = pTop;
    parentWidth = pWidth;
    parentHeight = pHeight;

    startWidth = width;
    startHeight = height;

    clientX = fromParent ? (e.clientX - parentX) : (left - parentX);
    clientY = fromParent ? (e.clientY - parentY) : (top - parentY);

    if (!overlap) {
      clientX = clientX < 0 ? 0 : clientX > parentWidth ? parentWidth : clientX;
      clientY = clientY < 0 ? 0 : clientY > parentHeight ? parentHeight : clientY;
    }

    offsetX = (clientX / parentWidth) * 100;
    offsetY = (clientY / parentHeight) * 100;

    middleDrag = isMiddleDrag(e, deltaTouch) || withSpace;
    initEvent = createEvent(middleDrag ? DragChangeType.MidStart : DragChangeType.Start);
    dragInit = true;
  };
  const dragMove = (e: MouseEvent, force?: boolean) => {
    if (!draggable && !force) return;
    if (!dragInit && !force) return;
    if (!isMoving(startX, e.clientX, startY, e.clientY, deltaMove) && !force) return;

    if (!dragging || force) {
      if (move) {
        position = getComputedStyle(element).position;
      }

      axisLock = axis;
      dragging = true;
      dispatch(initEvent);
      debug(`Drag started.`, true);
    }

    if (!dragging && !force) return;

    let dx = ((e.clientX - startX) / deltaScale);
    let dy = ((e.clientY - startY) / deltaScale);

    if (deltaX !== dx || deltaY !== dy) {
      if (e[lockAxisKey]) {
        axisLock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      } else if (axisLock !== axis) {
        axisLock = axis;
      }

      let cx = ![ 'x', 'all' ].includes(axisLock) ? clientX : (e.clientX - parentX); // Lock clientX;
      let cy = ![ 'y', 'all' ].includes(axisLock) ? clientY : (e.clientY - parentY); // Lock clientY;

      if (!overlap) {
        cx = cx < 0 ? 0 : cx > parentWidth ? parentWidth : cx; // Prevent clientX overlaps.
        cy = cy < 0 ? 0 : cy > parentHeight ? parentHeight : cy; // Prevent clientY overlaps.
      }

      let ox = (cx / parentWidth) * 100; // Calculate offsetX.
      let oy = (cy / parentHeight) * 100; // Calculate offsetY.

      if (step) {
        dx = Math.round(Math.round(dx / step) * step); // Round deltaX.
        dy = Math.round(Math.round(dy / step) * step); // Round deltaY.
        cx = Math.round(Math.round(cx / step) * step); // Round clientX.
        cy = Math.round(Math.round(cy / step) * step); // Round clientY.
        ox = Math.round(Math.round(ox / step) * step); // Round offsetX.
        oy = Math.round(Math.round(oy / step) * step); // Round offsetY.
      }

      if (!overlap && (axisLock === 'x') && (cx === clientX) && (ox === offsetX)) return; // Skip if no change.
      if (!overlap && (axisLock === 'y') && (cy === clientY) && (oy === offsetY)) return; // Skip if no change.

      if ([ 'x', 'all' ].includes(axisLock)) {
        deltaX = dx;
        clientX = cx;
        offsetX = ox;
      }

      if ([ 'y', 'all' ].includes(axisLock)) {
        deltaY = dy;
        clientY = cy;
        offsetY = oy;
      }

      if (e[lockRatioKey]) {
        deltaY = deltaX as never;
        clientY = clientX as never;
        offsetY = offsetX as never;
      }

      if (move && ![ 'relative', 'absolute', 'fixed' ].includes(position)) {
        position = 'absolute';
        element.style.position = position;
      }

      if (moveOffset) {
        if ([ 'x', 'all' ].includes(axisLock)) {
          element.style.left = `${ offsetX }%`;
        }

        if ([ 'y', 'all' ].includes(axisLock)) {
          element.style.top = `${ offsetY }%`;
        }
      } else if (move) {
        if ([ 'x', 'all' ].includes(axisLock)) {
          element.style.left = `${ startX + deltaX }px`;
        }

        if ([ 'y', 'all' ].includes(axisLock)) {
          element.style.top = `${ startY + deltaY }px`;
        }
      } else if (translate) {
        element.style.transform = `translate3d(${ deltaX }px, ${ deltaY }px, 0)`;
      }

      dispatch(middleDrag ? DragChangeType.MidMove : DragChangeType.Move);
    }
  };
  const dragEnd = (e: MouseEvent, force?: boolean) => {
    if (!draggable && !force) return;
    if (!dragInit && !force) return;
    if (!canDrag(e) && !force) return;

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

    dispatch(middleDrag ? DragChangeType.MidEnd : DragChangeType.End);

    dragInit = false;
    dragging = false;
    parentDragging = false;

    debug(`Drag completed by (${ deltaX }px, ${ deltaY }px).`, true);
  };

  let touchDrag = false;
  let lastTouch: TouchEvent | undefined;
  const touchStart = (e: TouchEvent) => {
    if (!canDrag(e)) return;

    touchDrag = true;
    lastTouch = e;
    assignTouchEvent(e);
    dragStart(e as never);
  };
  const touchMove = (e: TouchEvent) => {
    if (touchDrag) {
      e.preventDefault();
      e.stopPropagation();

      lastTouch = e;
      assignTouchEvent(e);
      dragMove(e as never);
    }
  };
  const touchEnd = () => {
    if (touchDrag && lastTouch) {
      dragEnd(lastTouch as never);
    }

    lastTouch = undefined;
    touchDrag = false;
    dragInit = false;
    dragging = false;
    lastTouch = undefined;
  };
  const assignTouchEvent = (e: TouchEvent, touch: Touch = e.touches[0]) => {
    Object.assign(e, {
      button: e.touches.length === 1 ? Mouse.Left : e.touches.length === 2 ? Mouse.Middle : e.touches.length,
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
  };

  let parentDragging = false;
  const parentStart = (e: MouseEvent) => {
    if (parentTrigger) {
      if (!canDrag(e) || e.target !== parent) return;

      const { clientX: x, clientY: y, button } = e;
      parentDragging = true;

      dragStart({ clientX: x, clientY: y, button, target: element } as never, true);
      dragMove({ clientX: x, clientY: y, button, target: element } as never, true);
    }
  };
  const parentEnd = (e: MouseEvent) => {
    if (parentDragging && e.target === parent) {
      const { clientX: x, clientY: y } = e;
      dragEnd({ clientX: x, clientY: y, button: Mouse.Left, target: element } as never, true);
    }
  };

  const parentTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchDrag = true;
      const { clientX: x, clientY: y } = e.touches[0];
      parentStart({ clientX: x, clientY: y, button: Mouse.Left, target: parent } as never);
    }
  };
  const parentTouchEnd = (e: TouchEvent) => {
    if (parentDragging) {
      const { clientX: x, clientY: y } = e.changedTouches[0];
      parentEnd({ clientX: x, clientY: y, button: Mouse.Left, target: parent } as never);
    }
  };

  const keydown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      withSpace = true;
    }
  };
  const keyup = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      withSpace = false;

      if (dragging) {
        dragEnd(e as never, true);
      }
    }
  };

  const register = () => {
    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);

    element.addEventListener('touchstart', touchStart, { passive: false });
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd, { passive: false });

    document.addEventListener('keydown', keydown);
    document.addEventListener('keyup', keyup);

    if (parentTrigger) {
      parent?.addEventListener('mousedown', parentStart);
      parent?.addEventListener('mouseup', parentEnd);
      parent?.addEventListener('touchstart', parentTouchStart, { passive: false });
      parent?.addEventListener('touchend', parentTouchEnd, { passive: false });
    }

    debug(`Drag registered.`);
  };
  const unregister = () => {
    element.removeEventListener('mousedown', dragStart);
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);

    element.removeEventListener('touchstart', touchStart);
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);

    document.removeEventListener('keydown', keydown);
    document.removeEventListener('keyup', keyup);

    parent?.removeEventListener('mousedown', parentStart);
    parent?.removeEventListener('mouseup', parentEnd);
    parent?.removeEventListener('touchstart', parentTouchStart);
    parent?.removeEventListener('touchend', parentTouchEnd);

    debug(`Drag destroyed.`);
  };

  const debug = (message: string, stats?: boolean) => {
    logger.debug(`[draggable:${ name }${ stats ? (':' + (middleDrag ? 'middle' : 'left')) : '' }] ${ message }`);
  };

  if (draggable) {
    register();
  }

  return {
    update: (opt?: DraggableOptions) => {
      if (opt?.draggable !== draggable) {
        unregister();

        draggable = opt?.draggable ?? draggable;

        if (draggable) {
          register();
        }
      }

      button = opt?.button ?? button;
      name = opt?.name ?? name;
      move = opt?.move ?? move;
      moveOffset = opt?.moveOffset ?? moveOffset;
      translate = opt?.translate ?? translate;

      step = opt?.step ?? step;
      axis = opt?.axis ?? axis;
      lockAxisKey = opt?.lockAxisKey ?? lockAxisKey;
      lockRatioKey = opt?.lockRatioKey ?? lockRatioKey;

      deltaScale = opt?.deltaScale ?? deltaScale;
      deltaMove = opt?.deltaMove ?? deltaMove;
      deltaTouch = opt?.deltaTouch ?? deltaTouch;

      resetEnd = opt?.resetEnd ?? resetEnd;
      resetEffect = opt?.resetEffect ?? resetEffect;

      parent = opt?.parent ?? parent;
      overlap = opt?.overlap ?? overlap;
      parentTrigger = opt?.parentTrigger ?? parentTrigger;

      debug(`Drag reconfigured.`);
    },
    destroy: () => {
      subscribers.clear();
      unregister();
    },
    subscribe: (callback: (e: DragChange) => void) => {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

export function createDraggable(init?: DraggableOptions) {
  return createComposer('drag', draggable, init);
}

export function useDraggable(init?: DraggableOptions) {
  return createHook('drag', draggable, init);
}

function canDrag(e: MouseEvent | TouchEvent) {
  return ('button' in e)
         ? (e.button === 0 || e.button === 1)
         : (e.touches?.length === 1 || e.touches?.length === 2);
}

function isPressed(e: MouseEvent | TouchEvent, button?: Mouse, distance = 100) {
  if (typeof button === 'undefined') return true;

  if ('button' in e) {
    return e.button === button;
  } else if (e instanceof TouchEvent) {
    if (e.touches.length === 1 && button === Mouse.Left) {
      return true;
    } else if (e.touches.length === 2 && button === Mouse.Middle) {
      return inTouchRange(e, distance);
    }
  }

  return false;
}

function inTouchRange(e: TouchEvent, distance = 100) {
  const [ firstTouch, secondTouch ] = (e.touches as never) as Touch[];

  const xDistance = Math.abs(firstTouch.clientX - secondTouch.clientX);
  const yDistance = Math.abs(firstTouch.clientY - secondTouch.clientY);

  return xDistance < distance && yDistance < distance;
}

function isMiddleDrag(e: MouseEvent | TouchEvent, distance = 100) {
  if ('button' in e) {
    return e.button === Mouse.Middle;
  } else if (e instanceof TouchEvent) {
    return e.touches.length !== 2 ? false : inTouchRange(e, distance);
  }

  return false;
}

function isMoving(sx: number, x: number, sy: number, y: number, delta: number) {
  return Math.abs(sx - x) > delta || Math.abs(sy - y) > delta;
}
