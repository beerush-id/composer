import { Action, createComposer, createHook } from '../core/index.js';
import { logger } from '@beerush/utils';
import { Mouse } from '../utils/index.js';

export enum PointerMode {
  Draw = 'draw',
  Drag = 'drag',
}

export enum OriginX {
  Left = 'start',
  Center = 'center',
  Right = 'end',
}

export enum OriginY {
  Top = 'start',
  Center = 'center',
  Bottom = 'end',
}

export type PointerOptions = {
  name?: string;
  mode?: PointerMode;
  passive?: boolean;
  scaleDeltas?: boolean;
  scaleClients?: boolean;
  relative?: HTMLElement;

  originX?: OriginX;
  originY?: OriginY;
  ratioLock?: boolean;
  deltaScale?: number;
  deltaZoom?: number;
  dragMin?: number;
  dragMax?: number;

  touchOnly?: boolean;
  mouseOnly?: boolean;
};
export type PointerChangeDetail = {
  clientX: number,
  clientY: number
  offsetX: number,
  offsetY: number,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number,
  clientLeft: number,
  clientTop: number,
  clientWidth: number,
  clientHeight: number,
  scale: number,
  isMoving: boolean,
  isDrawing: boolean,
  isDragging: boolean,
  isRatioLocked: boolean,
  originX: OriginX,
  originY: OriginY,
  mode: PointerMode,
  target: HTMLElement,
};
export type PointerChange = CustomEvent<PointerChangeDetail> & PointerChangeDetail;
export type Pointer = Action<PointerOptions, PointerChange>;

export enum PointerChangeType {
  Up = 'pointer-up',
  Down = 'pointer-down',
  Move = 'pointer-move',
  Menu = 'pointer-menu',
  DrawStart = 'pointer-draw-start',
  DrawEnd = 'pointer-draw-end',
  DragStart = 'pointer-drag-start',
  DragEnd = 'pointer-drag-end',
  Cancel = 'pointer-cancel',
}

export function pointer(element: HTMLElement, options: PointerOptions = {}): Pointer {
  let {
    mode,
    name = 'global',
    relative = element,
    passive = false,
    scaleDeltas = false,
    scaleClients = false,
    deltaScale = 1,
    deltaZoom = 1,
    originX = OriginX.Left,
    originY = OriginY.Top,
    ratioLock = false,
    dragMin = 50,
    dragMax = 125,
    touchOnly = false,
    mouseOnly = false,
  } = options || {};

  if (!('originX' in options)) {
    options.originX = originX;
  }

  if (!('originY' in options)) {
    options.originY = originY;
  }

  if (!('ratioLock' in options)) {
    options.ratioLock = ratioLock;
  }

  let startX = 0;
  let startY = 0;
  let clientX = 0;
  let clientY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let clientLeft = 0;
  let clientTop = 0;
  let clientWidth = 0;
  let clientHeight = 0;
  let spaceKey = false;
  let activeMode: PointerMode | undefined;
  let activeTarget: HTMLElement | undefined;
  let tracking = false;

  const pointers = new Map<number, PointerEvent>();
  const subscribers = new Set<(e: PointerChange) => void>();
  const dispatch = (type: PointerChangeType) => {
    const details = {
      clientX, clientY, offsetX, offsetY,
      startX, startY, deltaX, deltaY,
      clientLeft, clientTop, clientWidth, clientHeight,
      originX, originY,
      isRatioLocked: ratioLock,
      isMoving: type === PointerChangeType.Move,
      isDrawing: tracking && activeMode === PointerMode.Draw,
      isDragging: tracking && activeMode === PointerMode.Drag,
      mode: activeMode,
    };
    const event = new CustomEvent(type, {
      detail: { ...details, target: activeTarget },
      bubbles: true,
      cancelable: true,
      composed: true,
    }) as PointerChange;

    Object.assign(event, details);

    for (const callback of subscribers) {
      callback(event);
    }

    element.dispatchEvent(event);
  };

  const start = (e: PointerEvent) => {
    pointers.set(e.pointerId, e);

    activeMode = getPointerMode(pointers, dragMin, dragMax, spaceKey);

    if (e.isPrimary) {
      if (e.altKey) {
        originX = OriginX.Center;
        originY = OriginY.Center;
      }

      if (e.shiftKey) {
        ratioLock = true;
      }

      activeTarget = e.target as HTMLElement;
      dispatch(PointerChangeType.Down);
    }
  };
  const move = (e: PointerEvent) => {
    if ((passive && !e.pressure) || !e.isPrimary) return;

    const rect = relative.getBoundingClientRect();
    const cx = (e.clientX - (rect.left * (scaleClients ? deltaZoom : 1))) / deltaScale;
    const cy = (e.clientY - (rect.top * (scaleClients ? deltaZoom : 1))) / deltaScale;

    if (cx === clientX && cy === clientY) return;

    clientX = cx;
    clientY = cy;
    offsetX = (cx / rect.width) * 100;
    offsetY = (cy / rect.height) * 100;

    if (e.pressure && !tracking && isAcceptable(e)) {
      tracking = true;

      if (activeMode === PointerMode.Draw) {
        startX = clientX;
        startY = clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }

      dispatch(getEventType(activeMode));
      debug(`Pointer tracking started for ${ activeMode }.`);
    }

    if (tracking) {
      if (activeMode === PointerMode.Draw) {
        deltaX = (clientX - startX);
        deltaY = (clientY - startY);

        if (ratioLock) {
          deltaY = (deltaY < 0) ? (deltaX < 0 ? deltaX : -deltaX) : (deltaX < 0 ? -deltaX : deltaX);
        }

        [ clientLeft, clientWidth ] = snapOrigin(startX, deltaX, originX);
        [ clientTop, clientHeight ] = snapOrigin(startY, deltaY, originY);
      } else if (activeMode === PointerMode.Drag) {
        deltaX = (e.clientX - startX);
        deltaY = (e.clientY - startY);
      }
    }

    dispatch(PointerChangeType.Move);
  };
  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);

    if (activeMode && tracking) {
      dispatch(getEventType(activeMode, true));
      debug(`Pointer tracking ended`, true);
      flush();
    }

    if (!pointers.size) {
      dispatch(PointerChangeType.Up);
      flush();
    }
  };

  const leave = (e: PointerEvent) => {
    if (!activeMode || !e.isPrimary || !tracking) return;

    dispatch(PointerChangeType.Cancel);
    debug('Pointer tracking canceled.');
  };
  const keydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && activeMode && tracking) {
      dispatch(PointerChangeType.Cancel);
      debug('Pointer tracking canceled.');
      flush();
    }

    if (e.code === 'Space') {
      spaceKey = true;
    }
  };
  const keyup = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceKey = false;
    }
  };

  const flush = () => {
    startX = 0;
    startY = 0;
    deltaX = 0;
    deltaY = 0;
    clientLeft = 0;
    clientTop = 0;
    clientWidth = 0;
    clientHeight = 0;

    originX = options.originX ?? originX;
    originY = options.originY ?? originY;
    ratioLock = options.ratioLock ?? ratioLock;

    tracking = false;
    activeMode = undefined;
    activeTarget = undefined;
    pointers.clear();
  };

  const isAcceptable = (e: PointerEvent) => {
    if (!activeMode) return false;
    if (!spaceKey && typeof mode !== 'undefined' && activeMode !== mode) return false;

    return true;
  };

  const debug = (message: string, end?: boolean) => {
    if (end) {
      logger.debug(`[pointer:${ name }] ${ message } by ${ activeMode }(${ deltaX }px, ${ deltaY }px).`);
      return;
    }

    logger.debug(`[pointer:${ name }] ${ message }`);
  };

  element.addEventListener('pointerdown', start);
  element.addEventListener('pointerleave', leave);

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);

  document.addEventListener('keyup', keyup);
  document.addEventListener('keydown', keydown);

  debug('Pointer initialized.');

  return {
    update(newOptions?: PointerOptions) {
      Object.assign(options, newOptions);

      mode = newOptions?.mode ?? mode;
      name = newOptions?.name ?? name;

      deltaScale = newOptions?.deltaScale ?? deltaScale;
      deltaZoom = newOptions?.deltaZoom ?? deltaZoom;

      dragMin = newOptions?.dragMin ?? dragMin;
      dragMax = newOptions?.dragMax ?? dragMax;

      originX = newOptions?.originX ?? originX;
      originY = newOptions?.originY ?? originY;
      ratioLock = newOptions?.ratioLock ?? ratioLock;

      relative = newOptions?.relative ?? relative;
      passive = newOptions?.passive ?? passive;
      scaleDeltas = newOptions?.scaleDeltas ?? scaleDeltas;
      scaleClients = newOptions?.scaleClients ?? scaleClients;
      touchOnly = newOptions?.touchOnly ?? touchOnly;
      mouseOnly = newOptions?.mouseOnly ?? mouseOnly;
    },
    destroy() {
      element.removeEventListener('pointerdown', start);
      element.removeEventListener('pointerleave', leave);

      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);

      document.removeEventListener('keyup', keyup);
      document.removeEventListener('keydown', keydown);

      subscribers.clear();
      pointers.clear();

      debug('Pointer destroyed.');
    },
    subscribe(callback: (e: PointerChange) => void) {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

function snapOrigin(start: number, delta: number, origin: OriginX | OriginY): [ number, number ] {
  let size = Math.abs(delta);
  let position;

  if (origin === 'start') {
    position = (delta < 0) ? start - size : start;
  } else if (origin === 'center') {
    size *= 2;
    position = start - (size / 2);
  } else {  // origin === "end"
    position = (delta < 0) ? start : start - size;
  }

  return [ position, size ];
}

function getEventType(mode?: PointerMode, end?: boolean): PointerChangeType {
  switch (mode) {
    case PointerMode.Draw:
      return end ? PointerChangeType.DrawEnd : PointerChangeType.DrawStart;
    case PointerMode.Drag:
      return end ? PointerChangeType.DragEnd : PointerChangeType.DragStart;
    default:
      return end ? PointerChangeType.Up : PointerChangeType.Down;
  }
}

function getPointerMode(pointers: Map<number, PointerEvent>, dragMin = 100, dragMax = 200, space = false) {
  if (pointers.size === 1) {
    const [ pointer ] = Array.from(pointers.values());

    if (pointer.pointerType === 'mouse') {
      if (pointer.button === Mouse.Middle || space) return PointerMode.Drag;
    }

    return space ? PointerMode.Drag : PointerMode.Draw;
  } else if ((pointers.size >= 2)) {
    const distance = getPointerDistance(pointers);
    if (distance > dragMin && distance < dragMax) return PointerMode.Drag;
  }
}

function getPointerDistance(touches: Map<number, PointerEvent>) {
  if (touches.size === 1) {
    return 0;
  }

  if (touches.size === 2) {
    const [ t1, t2 ] = Array.from(touches.values());
    const x = t1.clientX - t2.clientX;
    const y = t1.clientY - t2.clientY;
    return Math.sqrt(x * x + y * y);
  }

  return 0;
}

export function createPointer(options?: PointerOptions) {
  return createComposer('watch', pointer, options);
}

export function usePointer(options?: PointerOptions) {
  return createHook('watch', pointer, options);
}
