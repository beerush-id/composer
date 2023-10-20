import { CMYK, HSL, HSLA, HSV, HSVA, RGB, RGBA } from './color.js';

/** HEX COLOR CONVERSIONS */
export function hexToRgb(hex: string): RGB;
export function hexToRgb(hex: string, alpha: true): RGBA;
export function hexToRgb(hex: string, alpha?: boolean): RGB | RGBA {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  let r = 0, g = 0, b = 0, a = 1;

  if (hex.length === 3 || hex.length === 4) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    a = (hex.length === 4) ? parseInt(hex.charAt(3) + hex.charAt(3), 16) / 255 : 1;
  } else if (hex.length === 6 || hex.length === 8) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
    a = hex.length === 8 ? (parseInt(hex.substring(6, 8), 16) / 255) : 1;
  }

  return alpha ? [ r, g, b, a ] : [ r, g, b ];
}

export function hexToRgba(hex: string): RGBA {
  return hexToRgb(hex, true) as RGBA;
}

export function hexToHsl(hex: string): HSL {
  const [ r, g, b ] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hexToHsla(hex: string): HSLA {
  const [ r, g, b, a ] = hexToRgba(hex);
  return rgbToHsla(r, g, b, a);
}

export function hexToHsv(hex: string): HSV {
  const [ r, g, b ] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export function hexToHsva(hex: string): HSVA {
  const [ r, g, b, a ] = hexToRgba(hex);
  return rgbToHsva(r, g, b, a);
}

export function hexToCmyk(hex: string): CMYK {
  const [ r, g, b ] = hexToRgb(hex);
  return rgbToCmyk(r, g, b);
}

/** RGB COLOR CONVERSIONS */
export function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const rgbHex = ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();

  if (a < 1) {
    const alpha = Math.round(a * 255);
    const hexAlpha = (alpha + 0x10000).toString(16).substr(-2).toUpperCase();

    return '#' + rgbHex + hexAlpha;
  } else {
    return '#' + rgbHex;
  }
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = (max + min) / 2;
  let s = h;
  const l = h;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;

    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [ Math.round(h * 360), Math.round(s * 100), Math.round(l * 100) ];
}

export function rgbToHsla(r: number, g: number, b: number, a = 1): HSLA {
  const [ h, s, l ] = rgbToHsl(r, g, b);
  return [ h, s, l, a ];
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  const h = max === min ? 0 :
            max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 :
            max === g ? ((b - r) / d + 2) / 6 :
            ((r - g) / d + 4) / 6;

  const s = max === 0 ? 0 : d / max;

  return [ Math.round(h * 360), Math.round(s * 100), Math.round(max * 100) ];
}

export function rgbToHsva(r: number, g: number, b: number, a = 1): HSVA {
  const [ h, s, v ] = rgbToHsv(r, g, b);
  return [ h, s, v, a ];
}

export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  r /= 255;
  g /= 255;
  b /= 255;

  const k = 1 - Math.max(r, g, b);
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);

  return [ Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100) ];
}

/** HSL COLOR CONVERSIONS */
export function hslToHex(h: number, s: number, l: number, a = 1): string {
  const [ r, g, b ] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b, a);
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
}

export function hslToRgba(h: number, s: number, l: number, a = 1): RGBA {
  const [ r, g, b ] = hslToRgb(h, s, l);
  return [ r, g, b, a ];
}

export function hslToHsv(h: number, s: number, l: number): HSV {
  s /= 100;
  l /= 100;

  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);

  return [ h, Math.round(sv * 100), Math.round(v * 100) ];
}

export function hslToHsva(h: number, s: number, l: number, a = 1): HSVA {
  const [ h2, s2, v ] = hslToHsv(h, s, l);
  return [ h2, s2, v, a ];
}

export function hslToCmyk(h: number, s: number, l: number): CMYK {
  const [ r, g, b ] = hslToRgb(h, s, l);
  return rgbToCmyk(r, g, b);
}

/** HSV COLOR CONVERSIONS */
export function hsvToHex(h: number, s: number, v: number, a = 1): string {
  const [ r, g, b ] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b, a);
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  h /= 360;
  s /= 100;
  v /= 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  const colorParams = [
    [ v, t, p ],
    [ q, v, p ],
    [ p, v, t ],
    [ p, q, v ],
    [ t, p, v ],
    [ v, p, q ],
  ];

  const [ r, g, b ] = colorParams[i % 6];
  return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
}

export function hsvToRgba(h: number, s: number, v: number, a = 1): RGBA {
  const [ r, g, b ] = hsvToRgb(h, s, v);
  return [ r, g, b, a ];
}

export function hsvToHsl(h: number, s: number, v: number): HSL {
  s /= 100;
  v /= 100;

  const l = v - (v * s / 2);
  const s2 = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);

  return [ h, Math.round(s2 * 100), Math.round(l * 100) ];
}

export function hsvToHsla(h: number, s: number, v: number, a = 1): HSLA {
  const [ h2, s2, l ] = hsvToHsl(h, s, v);
  return [ h2, s2, l, a ];
}

export function hsvToCmyk(h: number, s: number, v: number): CMYK {
  const [ r, g, b ] = hsvToRgb(h, s, v);
  return rgbToCmyk(r, g, b);
}

/** CMYK COLOR CONVERSIONS */
export function cmykToRgb(c: number, m: number, y: number, k: number): RGB {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;

  const r = 1 - Math.min(1, c * (1 - k) + k);
  const g = 1 - Math.min(1, m * (1 - k) + k);
  const b = 1 - Math.min(1, y * (1 - k) + k);

  return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
}

export function decomposeHexColor(hex: string): { color: string, alpha: number } {
  let color: string = hex;
  let alpha = 1;

  if (hex.charAt(0) === '#') {
    hex = hex.slice(1);
  }

  if (hex.length === 3 || hex.length === 6) {
    color = '#' + hex;
  } else if (hex.length === 4 || hex.length === 8) {
    color = '#' + hex.slice(0, hex.length - 2);

    if (hex.length === 4) {
      alpha = parseInt(hex[3] + hex[3], 16) / 255;
    } else {
      alpha = parseInt(hex.slice(6, 8), 16) / 255;
    }
  }

  return { color, alpha };
}

export function aliasToHex(name: string): string {
  const ctx: CanvasRenderingContext2D = document.createElement('canvas').getContext('2d') as never;
  ctx.fillStyle = name;
  return ctx.fillStyle;
}
