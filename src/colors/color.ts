export type Red = number;
export type Green = number;
export type Blue = number;
export type Alpha = number;
export type Hue = number;
export type Saturation = number;
export type Lightness = number;
export type Value = number;
export type Cyan = number;
export type Magenta = number;
export type Yellow = number;
export type Black = number;
export type RGB = [ Red, Green, Blue ];
export type RGBA = [ Red, Green, Blue, Alpha ];
export type HSL = [ Hue, Saturation, Lightness ];
export type HSLA = [ Hue, Saturation, Lightness, Alpha ];
export type HSV = [ Hue, Saturation, Value ];
export type HSVA = [ Hue, Saturation, Value, Alpha ];
export type CMYK = [ Cyan, Magenta, Yellow, Black ];

export enum Hsl {
  Hue = 0,
  Saturation = 1,
  Lightness = 2,
  Alpha
}

export enum Rgb {
  Red = 0,
  Green = 1,
  Blue = 2,
  Alpha
}

export enum Hsv {
  Hue = 0,
  Saturation = 1,
  Value = 2,
  Alpha
}

export enum Cmyk {
  Cyan = 0,
  Magenta = 1,
  Yellow = 2,
  Black = 3
}

export type ColorHue = {
  value: string;
  hue: number
}

export enum Harmony {
  Complementary = 'complementary',
  SplitComplementary = 'splitComplementary',
  Analogous = 'analogous',
  Triadic = 'triadic',
  Tetradic = 'tetradic',
  Monochromatic = 'monochromatic',
  Square = 'square',
}
