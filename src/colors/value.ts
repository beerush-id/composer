import {
  aliasToHex,
  cmykToRgb,
  hexToHsl,
  hexToHsla,
  hexToHsv,
  hexToHsva,
  hexToRgb,
  hexToRgba,
  hslToHex,
  hslToRgb,
  hsvToHex,
  rgbToCmyk,
  rgbToHex,
} from './converter.js';
import { CMYK, ColorHue, HSL, HSLA, HSV, HSVA, RGB, RGBA } from './color.js';

export class ColorValue {
  get hex() {
    return this.value;
  }

  set hex(c: string) {
    this.value = c;
  }

  get rgb(): RGB {
    return hexToRgb(this.value);
  }

  set rgb(c: RGB) {
    this.value = rgbToHex(...c);
  }

  get rgba(): RGBA {
    return hexToRgba(this.value);
  }

  set rgba(c: RGBA) {
    this.value = rgbToHex(...c);
  }

  get hsl(): HSL {
    return hexToHsl(this.value);
  }

  set hsl(c: HSL) {
    this.value = hslToHex(...c);
  }

  get hsla(): HSLA {
    return hexToHsla(this.value);
  }

  set hsla(c: HSLA) {
    this.value = hslToHex(...c);
  }

  get hsv(): HSV {
    return hexToHsv(this.value);
  }

  set hsv(c: HSV) {
    this.value = hsvToHex(...c);
  }

  get hsva(): HSVA {
    return hexToHsva(this.value);
  }

  set hsva(c: HSVA) {
    this.value = hsvToHex(...c);
  }

  get cmyk(): CMYK {
    const [ r, g, b ] = hexToRgb(this.value);
    return rgbToCmyk(r, g, b);
  }

  set cmyk(c: CMYK) {
    this.value = rgbToHex(...cmykToRgb(...c));
  }

  get complementary(): [ ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ 0, 180 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  get splitComplementary(): [ ColorHue, ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ 0, 150, 210 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  get analogous(): [ ColorHue, ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ 0, 330, 30 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  get triadic(): [ ColorHue, ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ 0, 120, 240 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  get tetradic(): [ ColorHue, ColorHue, ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ -30, 30, 150, 210 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  get monochromatic(): [ ColorHue, ColorHue, ColorHue, ColorHue, ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ 0, 10, 20, 30, 40, 50 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  get square(): [ ColorHue, ColorHue, ColorHue, ColorHue ] {
    const [ h, s, l ] = hexToHsl(this.value);
    return [ 0, 90, 180, 270 ].map(r => {
      return { value: hslToHex(h + r, s, l), hue: r };
    }) as never;
  }

  constructor(public value: string) {}

  darken(amount: number) {
    const [ h, s, l, a ] = hexToHsla(this.value);
    this.value = rgbToHex(...hslToRgb(h, s, l - amount), a);
    return this;
  }

  lighten(amount: number) {
    const [ h, s, l, a ] = hexToHsla(this.value);
    this.value = rgbToHex(...hslToRgb(h, s, l + amount), a);
    return this;
  }

  rotate(amount: number) {
    const [ h, s, l ] = hexToHsl(this.value);
    this.value = hslToHex(h + amount, s, l);
    return this;
  }

  opacity(amount: number) {
    const [ r, g, b ] = hexToRgb(this.value);
    this.value = rgbToHex(r, g, b, amount);
    return this;
  }
}

export function colorValue(value: string): ColorValue {
  if (value.startsWith('rgb')) {
    const [ r, g, b, a = '1' ] = value.match(/\d+/g) as RegExpMatchArray;
    return colorValue(rgbToHex(parseInt(r), parseInt(g), parseInt(b), parseInt(a)));
  } else if (value.startsWith('hsl')) {
    const [ h, s, l, a = '1' ] = value.match(/\d+/g) as RegExpMatchArray;
    return colorValue(hslToHex(parseInt(h), parseInt(s), parseInt(l), parseInt(a)));
  } else if (value.startsWith('hsv')) {
    const [ h, s, v, a = '1' ] = value.match(/\d+/g) as RegExpMatchArray;
    return colorValue(hsvToHex(parseInt(h), parseInt(s), parseInt(v), parseInt(a)));
  } else if (value.startsWith('cmyk')) {
    const [ c, m, y, k ] = value.match(/\d+/g) as RegExpMatchArray;
    const [ r, g, b ] = cmykToRgb(parseInt(c), parseInt(m), parseInt(y), parseInt(k));
    return colorValue(rgbToHex(r, g, b));
  } else if (value === 'transparent') {
    return colorValue('rgba(0, 0, 0, 0)');
  } else if (!value.startsWith('#')) {
    value = aliasToHex(value);
  }

  return new ColorValue(value);
}
