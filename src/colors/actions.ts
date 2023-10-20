import { DragChangeType, draggable, DragWith } from '../actions/index.js';
import { slider, type Slider, SliderEventType } from '../components/index.js';
import { logger } from '@beerush/utils';
import { hslToHex } from './converter.js';
import { createHueWheel, createSwatches } from './generator.js';
import { colorValue } from './value.js';

/** COLOR PICKER */
export type PickerOptions = {
  value?: string;
  orientation?: 'horizontal' | 'vertical';
  swatchesLength?: number;
};
export type Picker = {
  hues: string[];
  swatches: Array<string[]>;
  hue: (element: HTMLElement, value?: number) => {
    update: (value?: number) => void;
    destroy: () => void;
  };
  alpha: (element: HTMLElement, value?: number) => {
    update: (value?: number) => void;
    destroy: () => void;
  };
  area: (element: HTMLElement, color?: string) => {
    update: (color?: string) => void;
    destroy: () => void;
  };
  shades: (hue: number, saturation: number) => string[];
  update: (options?: PickerOptions) => void;
  destroy: () => void;
  subscribe: (callback: (e: PickerEvent) => void) => () => void;
}

export enum EventType {
  Input = 'input',
  Change = 'change',
}

export enum PickerKey {
  Picker = 'color-picker',
  Vertical = 'color-picker-vertical',
}

export type PickerEvent = CustomEvent<string>;

export function createPicker(init?: PickerOptions): Picker {
  let { value = '#ffffff', orientation = 'horizontal' } = init || ({} as PickerOptions);
  const subscribers = new Set<(e: CustomEvent<string>) => void>();
  const subscriptions = new Set<() => void>();

  let [ h, s, l, a ] = colorValue(value).hsla;
  let pickerX = s;
  let pickerY = 100 - l;

  let pickerElement: HTMLElement;
  let hueElement: HTMLElement;
  let alphaElement: HTMLElement;
  let hueClient: Slider;
  let alphaClient: Slider;

  const dispatch = (type: EventType) => {
    const event = new CustomEvent(type, { detail: value });
    subscribers.forEach(emit => emit(event));
  };

  const assignColor = (color: string) => {
    if (color === value) return;

    value = color;
    [ h, s, l, a ] = colorValue(value).hsla;

    pickerX = s;
    pickerY = 100 - l;

    hueClient?.update({ value: h });
    alphaClient?.update({ value: a });

    placePicker();
  };
  const applyValues = () => {
    value = hslToHex(h, s, l, a);
    dispatch(EventType.Input);
    placePicker();
  };
  const applyArea = (ns: number, nl: number) => {
    s = ns;
    l = nl;

    pickerX = s;
    pickerY = 100 - l;

    applyValues();
  };

  const placePicker = () => {
    pickerElement?.style.setProperty('--picker-x', `${ pickerX }%`);
    pickerElement?.style.setProperty('--picker-y', `${ pickerY }%`);
    hueElement?.style.setProperty('--track-color', `hsl(${ h }, 100%, 50%)`);
    alphaElement?.style.setProperty('--track-color', `hsla(${ h }, ${ s }%, ${ l }%, ${ a })`);
    placeAlphaFill();
  };
  const placeAlphaFill = () => {
    const dir = orientation === 'horizontal' ? 'right' : 'top';
    alphaElement?.parentElement?.style.setProperty(
      '--slider-fill',
      `linear-gradient(to ${ dir }, transparent, hsl(${ h }, ${ s }%, ${ l }%))`,
    );
  };

  logger.debug('[picker] Color picker created.');

  return {
    hues: createHueWheel(),
    swatches: createSwatches(init?.swatchesLength),
    hue(element: HTMLElement, hue = h) {
      hueElement = element;
      hueClient = slider(element, { max: 360, value: hue, orientation });
      const unsubscribe = hueClient.subscribe(e => {
        h = e.detail;
        applyValues();

        if (e.type === SliderEventType.Change) {
          dispatch(EventType.Change);
          logger.debug('[picker:hue] Color picker hue changed.');
        }
      });

      element.style.setProperty('--track-color', `hsl(${ hue }, 100%, 50%)`);
      subscriptions.add(unsubscribe);

      logger.debug('[picker:hue] Color picker hue initialized.');

      return {
        update(newHue?: number) {
          if (newHue && newHue !== hue) {
            hue = newHue ?? hue;

            hueClient.update({ value: hue });
            logger.debug('[picker:hue] Color picker hue assigned.');
          }
        },
        destroy() {
          unsubscribe();
          subscriptions.delete(unsubscribe);
          hueClient.destroy();
          logger.debug('[picker:hue] Color picker hue destroyed.');
        },
      };
    },
    alpha(element: HTMLElement, alpha = a) {
      alphaElement = element;
      alphaClient = slider(element, { max: 1, value: alpha, step: 0.01, orientation, reverse: true });
      const unsubscribe = alphaClient.subscribe(e => {
        a = e.detail;
        applyValues();

        if (e.type === SliderEventType.Change) {
          dispatch(EventType.Change);
          logger.debug('[picker:alpha] Color picker alpha changed.');
        }
      });

      placeAlphaFill();
      element.style.setProperty('--track-color', `hsla(${ h }, ${ s }%, ${ l }%, ${ alpha })`);

      subscriptions.add(unsubscribe);
      logger.debug('[picker:alpha] Color picker alpha initialized.');

      return {
        update(newAlpha?: number) {
          if (newAlpha && newAlpha !== alpha) {
            alpha = newAlpha ?? alpha;

            alphaClient.update({ value: alpha });
            logger.debug('[picker:alpha] Color picker alpha assigned.');
          }
        },
        destroy() {
          unsubscribe();
          subscriptions.delete(unsubscribe);
          alphaClient.destroy();
          logger.debug('[picker:alpha] Color picker alpha destroyed.');
        },
      };
    },
    area(element: HTMLElement, color = value) {
      pickerElement = element;

      assignColor(color);

      const client = draggable(element, DragWith.Slider);
      const unsubscribe = client.subscribe(e => {
        const { offsetX, offsetY } = e.detail;
        applyArea(offsetX, 100 - offsetY);

        if (e.type === DragChangeType.End) {
          dispatch(EventType.Change);
          logger.debug('[picker:area] Color picker area changed.');
        }
      });

      element.style.setProperty('--picker-x', `${ pickerX }%`);
      element.style.setProperty('--picker-y', `${ pickerY }%`);

      subscriptions.add(unsubscribe);

      logger.debug('[picker:area] Color picker area initialized.');

      return {
        update(color?: string) {
          if (color && color !== value) {
            assignColor(color);
            logger.debug('[picker:area] Color picker area assigned.');
          }
        },
        destroy() {
          unsubscribe();
          subscriptions.delete(unsubscribe);
          client.destroy();
          logger.debug('[picker:area] Color picker area destroyed.');
        },
      };
    },
    shades: (hue: number, saturation: number) => {
      return [ 95, 85, 75, 65, 55, 50, 45, 35, 25, 15 ].map(lightness => hslToHex(hue, saturation, lightness));
    },
    update(options?: PickerOptions) {
      if (options?.value && options.value !== value) {
        assignColor(options?.value);
      }

      orientation = options?.orientation ?? orientation;
    },
    destroy() {
      subscriptions.forEach(unsubscribe => unsubscribe());
      subscribers.clear();
      logger.debug('[picker] Color picker destroyed.');
    },
    subscribe(callback: (e: PickerEvent) => void) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };
}
