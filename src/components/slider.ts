import { DragChangeType, draggable } from '../actions/index.js';
import { createComposer, createHook } from '../core/index.js';
import { isFloat } from '@beerush/utils';

export type SliderOptions = {
  min?: number;
  max?: number;
  step?: number;
  stepMultiplier?: number;
  value?: number;
  reverse?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export enum SliderEventType {
  Input = 'slider-input',
  Change = 'slider-change',
}

export type SliderEvent = CustomEvent<number>;
export type Slider = {
  update: (options?: SliderOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: SliderEvent) => void) => () => void;
}

export function slider(
  element: HTMLElement,
  options: SliderOptions = {},
): Slider {
  let {
    min = 0,
    max = 100,
    step = 1,
    stepMultiplier = 10,
    value = 0,
    reverse = false,
    orientation = 'horizontal',
  } = options;

  let changed = false;

  const drag = draggable(element, {
    step: ((step / max) * 100),
    axis: orientation === 'horizontal' ? 'x' : 'y',
    overlap: false,
    parentTrigger: true,
  });

  const dispatch = (type: SliderEventType) => {
    element.dispatchEvent(new CustomEvent(type, {
      detail: value,
      bubbles: true,
      cancelable: true,
      composed: true,
    }));
  };
  const place = () => {
    const offset = reverse ? ((max - value) / max * 100) : (value / max * 100);
    if (offset < 0 || offset > 100) return;

    if (orientation === 'horizontal') {
      element.style.left = `${ offset }%`;
    } else {
      element.style.top = `${ offset }%`;
    }
  };
  const set = (newValue: number) => {
    let next = newValue < min ? min : newValue > max ? max : newValue;

    if (!isFloat(next)) {
      next = Math.round(next);
    }

    if (reverse) {
      next = (max - next);
    }

    if (next !== value) {
      value = next;
      changed = true;
      place();
      dispatch(SliderEventType.Input);
      return true;
    }

    return false;
  };

  const subscribers = new Set<(e: SliderEvent) => void>();
  const unsubscribe = drag.subscribe(e => {
    const { offsetX, offsetY } = e.detail;

    const offset = ((orientation === 'horizontal' ? offsetX : offsetY) / 100) * max;

    set(offset);

    if (e.type === DragChangeType.End) {
      dispatch(SliderEventType.Change);
    }
  });

  const keydown = (e: KeyboardEvent) => {
    const s = e.shiftKey ? step * stepMultiplier : e.ctrlKey ? step / stepMultiplier : step;

    if ([ 'ArrowUp', 'ArrowRight' ].includes(e.key)) {
      set(value + s);
    }

    if ([ 'ArrowDown', 'ArrowLeft' ].includes(e.key)) {
      set(value - s);
    }
  };
  const keyup = () => {
    if (!changed) return;

    changed = false;
    dispatch(SliderEventType.Change);
  };

  element.addEventListener('keydown', keydown);
  element.addEventListener('keyup', keyup);

  place();

  return {
    update: (newOptions?: SliderOptions) => {
      min = newOptions?.min ?? min;
      max = newOptions?.max ?? max;
      stepMultiplier = newOptions?.stepMultiplier ?? stepMultiplier;
      reverse = newOptions?.reverse ?? reverse;

      if (newOptions?.orientation && orientation !== newOptions?.orientation) {
        orientation = newOptions?.orientation ?? orientation;
        drag.update({ axis: orientation === 'horizontal' ? 'x' : 'y' });
      }

      if (newOptions?.step && step !== newOptions?.step) {
        step = newOptions?.step ?? step;
        drag.update({ step: (step / max * 100) });
      }

      if (value !== newOptions?.value) {
        value = newOptions?.value ?? value;

        place();
      }
    },
    destroy: () => {
      for (const callback of subscribers) {
        element.removeEventListener(SliderEventType.Input as never, callback);
        element.removeEventListener(SliderEventType.Change as never, callback);
      }

      element.removeEventListener('keydown', keydown);
      element.removeEventListener('keyup', keyup);

      unsubscribe();
      drag.destroy();
      subscribers.clear();
    },
    subscribe: (callback: (e: SliderEvent) => void) => {
      subscribers.add(callback);
      element.addEventListener(SliderEventType.Input as never, callback);
      element.addEventListener(SliderEventType.Change as never, callback);

      return () => {
        subscribers.delete(callback);
        element.removeEventListener(SliderEventType.Input as never, callback);
        element.removeEventListener(SliderEventType.Change as never, callback);
      };
    },
  };
}

export function createSlider(init?: SliderOptions) {
  return createComposer('slider', slider, init);
}

export function useSlider(init?: SliderOptions) {
  return createHook('slider', slider, init);
}
