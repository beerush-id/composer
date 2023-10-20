import { cmykToRgb, hslToRgb, hsvToRgb, rgbToHex } from './converter.js';
import { colorValue, ColorValue } from './value.js';

export class Color {
  public ref: ColorValue;

  get hex() {
    return this.ref.hex;
  }

  set hex(c: string) {
    this.ref.hex = c;
  }

  get rgb() {
    return `rgb(${ this.ref.rgb.join(', ') })`;
  }

  set rgb(c: string) {
    const [ r, g, b ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.rgb = [ parseInt(r), parseInt(g), parseInt(b) ];
  }

  get rgba() {
    return `rgba(${ this.ref.rgba.join(', ') })`;
  }

  set rgba(c: string) {
    const [ r, g, b, a ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.rgba = [ parseInt(r), parseInt(g), parseInt(b), parseInt(a) ];
  }

  get hsl() {
    const [ h, s, l ] = this.ref.hsl;
    return `hsl(${ h }, ${ s }%, ${ l }%)`;
  }

  set hsl(c: string) {
    const [ h, s, l ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.hsl = [ parseInt(h), parseInt(s), parseInt(l) ];
  }

  get hsla() {
    const [ h, s, l, a ] = this.ref.hsla;
    return `hsla(${ h }, ${ s }%, ${ l }%, ${ a })`;
  }

  set hsla(c: string) {
    const [ h, s, l, a ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.hsla = [ parseInt(h), parseInt(s), parseInt(l), parseInt(a) ];
  }

  get hsv() {
    const [ h, s, v ] = this.ref.hsv;
    return `hsv(${ h }, ${ s }%, ${ v }%)`;
  }

  set hsv(c: string) {
    const [ h, s, v ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.hsv = [ parseInt(h), parseInt(s), parseInt(v) ];
  }

  get hsva() {
    const [ h, s, v, a ] = this.ref.hsva;
    return `hsva(${ h }, ${ s }%, ${ v }%, ${ a })`;
  }

  set hsva(c: string) {
    const [ h, s, v, a ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.hsva = [ parseInt(h), parseInt(s), parseInt(v), parseInt(a) ];
  }

  get cmyk() {
    return `cmyk(${ this.ref.cmyk.join(', ') })`;
  }

  set cmyk(c: string) {
    const [ c1, m, y, k ] = c.match(/\d+/g) as RegExpMatchArray;
    this.ref.cmyk = [ parseInt(c1), parseInt(m), parseInt(y), parseInt(k) ];
  }

  constructor(public value: string) {
    this.ref = colorValue(value);
  }

  darken(amount: number) {
    this.ref.darken(amount);
    return this;
  }

  lighten(amount: number) {
    this.ref.lighten(amount);
    return this;
  }

  rotate(amount: number) {
    this.ref.rotate(amount);
    return this;
  }

  opacity(amount: number) {
    this.ref.opacity(amount);
    return this;
  }
}

export function color(value: string) {
  return new Color(value);
}

export function rgb(r: number, g: number, b: number) {
  return color(rgbToHex(r, g, b));
}

export function rgba(r: number, g: number, b: number, a: number) {
  return color(rgbToHex(r, g, b, a));
}

export function hsl(h: number, s: number, l: number) {
  return color(rgbToHex(...hslToRgb(h, s, l)));
}

export function hsla(h: number, s: number, l: number, a: number) {
  return color(rgbToHex(...hslToRgb(h, s, l), a));
}

export function hsv(h: number, s: number, v: number) {
  return color(rgbToHex(...hsvToRgb(h, s, v)));
}

export function hsva(h: number, s: number, v: number, a: number) {
  return color(rgbToHex(...hsvToRgb(h, s, v), a));
}

export function cmyk(c: number, m: number, y: number, k: number) {
  return color(rgbToHex(...cmykToRgb(c, m, y, k)));
}
