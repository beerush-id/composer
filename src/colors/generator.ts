import type { Color } from './map.js';
import { rgba } from './map.js';
import { aliasToHex, hexToHsl, hslToHex, hslToRgb } from './converter.js';
import { colorValue } from './value.js';
import { HSL, Hue, Lightness, Saturation } from './color.js';

/** COLOR UTILITIES */
export type HSLWheel = {
  image: string;
  pick: (x: number, y: number) => Color;
}

export function hslWheel(width = 360, height = 100): HSLWheel {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imageData = ctx.createImageData(width, height);

  canvas.width = width;
  canvas.height = height;

  for (let i = 0; i < width; ++i) {
    for (let j = 0; j < height; ++j) {
      const [ r, g, b ] = hslToRgb(i / width * 360, j / height * 100, 50);
      const index = (j * width + i) * 4;
      imageData.data[index] = r;
      imageData.data[index + 1] = g;
      imageData.data[index + 2] = b;
      imageData.data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    image: canvas.toDataURL(),
    pick(x: number, y: number) {
      const base = (Math.floor(y) * width + Math.floor(x)) * 4;
      const { data } = imageData;
      return rgba(data[base], data[base + 1], data[base + 2], data[base + 3]);
    },
  };
}

export function createHueWheel() {
  const colors: string[] = [];
  const steps = 360;
  const saturation = 100;
  const lightness = 50;

  for (let hue = 0; hue <= steps; hue += 45) {
    colors.push(hslToHex(hue as Hue, saturation as Saturation, lightness as Lightness));
  }

  return colors;
}

export function createHueList(count = 10): string[] {
  const colors = [];
  const steps = 360;

  for (let hue = 0; hue <= steps; hue += (steps / count)) {
    colors.push(hslToHex(hue as Hue, 100, 50));
  }

  return colors;
}

export function createSwatches(count = 10) {
  const group = [];

  const red = colorValue('#dc0000');
  const pink = colorValue('#ff00c3');
  const orange = colorValue('#ff5e00');
  const yellow = colorValue('#ffcc00');
  const green = colorValue('#12ff00');
  const purple = colorValue('#9100ff');
  const blue = colorValue('#0077ff');

  const blackColors = [];
  for (let i = count; i >= 0; --i) {
    blackColors.push(hslToHex(0, 0, i * (100 / count) as Lightness));
  }
  group.push(blackColors);

  for (const [ h, s ] of [ red.hsl, orange.hsl, pink.hsl, yellow.hsl, green.hsl, purple.hsl, blue.hsl ]) {
    const colors = [];

    for (let i = count + 1; i > 0; --i) {
      colors.push(hslToHex(h, s, i * (80 / count) as Lightness));
    }

    group.push(colors);
  }

  return group;
}

export function createCommonColors() {
  return [
    'crimson',
    'red',
    'salmon',
    'lightgreen',
    'lime',
    'green',
    'lightblue',
    'skyblue',
    'blue',
    'navy',
  ].map(n => aliasToHex(n));
}

export function drawHueWheel(hsl: HSL, steps: number, width: number, height: number, svg?: SVGElement): SVGElement {
  const element = svg ?? document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  element.setAttribute('viewBox', `0 0 ${ width } ${ height }`);

  const [ h, s, l ] = hsl;
  const radius = Math.min(width, height) / 2;
  const arcDegree = (360 / steps);

  for (let i = 0; i < steps; i++) {
    const startAngle = i * arcDegree;
    const endAngle = (i + 1) * arcDegree;
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    const start = {
      x: width / 2 + radius * Math.cos(Math.PI * startAngle / 180),
      y: height / 2 + radius * Math.sin(Math.PI * startAngle / 180),
    };

    const end = {
      x: width / 2 + radius * Math.cos(Math.PI * endAngle / 180),
      y: height / 2 + radius * Math.sin(Math.PI * endAngle / 180),
    };

    const color = hslToHex(h + i * arcDegree, s, l);
    const d = [
      `M ${ width / 2 } ${ height / 2 }`,
      `L ${ start.x } ${ start.y }`,
      `A ${ radius } ${ radius } 0 ${ largeArcFlag } 1 ${ end.x } ${ end.y }`,
      'Z',
    ].join(' ');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    path.setAttribute('d', d);
    path.setAttribute('fill', color);
    path.addEventListener('click', () => {
      element.dispatchEvent(new CustomEvent('color', { detail: color }));
    });

    element.appendChild(path);
  }

  element.style.setProperty('rotate', `${ (h - (90 + (arcDegree / 2))) % 360 }deg`);

  return element;
}

export type HueRotateOptions = {
  color: HSL;
  width?: number;
  height?: number;
  steps?: number;
}

export function huewheel(element: HTMLElement | SVGElement, options?: HueRotateOptions) {
  let { color, width = 150, height = 150, steps = 18 } = options || ({} as HueRotateOptions);
  let svg: SVGElement;

  const update = (newOptions?: HueRotateOptions) => {
    color = newOptions?.color ?? color;
    width = newOptions?.width ?? width;
    height = newOptions?.height ?? height;
    steps = newOptions?.steps ?? steps;

    const paths: SVGPathElement[] = svg?.querySelectorAll('path') as never || [];
    for (let i = 0; i < paths.length; i++) {
      paths[i].remove();
    }

    svg = drawHueWheel(
      color,
      steps,
      width,
      height,
      element instanceof SVGElement ? element : document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    );

    if (!(element instanceof SVGElement)) {
      element.appendChild(svg);
    }
  };

  update();

  return {
    update,
    destroy: () => {
      svg?.remove();
    },
  };
}

export function createHuePath(size: number, slices: number, holeSize = 0, startAt = 0) {
  const sliceAngle = 360 / slices;
  const startAngle = startAt * sliceAngle - 90 - (sliceAngle / 2);
  const endAngle = (startAt + 1) * sliceAngle - 90 - (sliceAngle / 2);
  const outerRadius = size / 2;
  const innerRadius = outerRadius - holeSize;

  const largeArcFlag = sliceAngle <= 180 ? '0' : '1';

  const x1 = size / 2 + outerRadius * Math.cos(Math.PI * startAngle / 180.0);
  const y1 = size / 2 + outerRadius * Math.sin(Math.PI * startAngle / 180.0);

  const x2 = size / 2 + outerRadius * Math.cos(Math.PI * endAngle / 180.0);
  const y2 = size / 2 + outerRadius * Math.sin(Math.PI * endAngle / 180.0);

  const x3 = size / 2 + innerRadius * Math.cos(Math.PI * endAngle / 180.0);
  const y3 = size / 2 + innerRadius * Math.sin(Math.PI * endAngle / 180.0);

  const x4 = size / 2 + innerRadius * Math.cos(Math.PI * startAngle / 180.0);
  const y4 = size / 2 + innerRadius * Math.sin(Math.PI * startAngle / 180.0);

  return [
    'M', x1, y1,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
    'L', x3, y3,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
    'Z',
  ].join(' ');
}

export function drawSlice(size: number, slices: number, depth = 24) {
  const colors = [];

  for (let i = 0; i < slices; ++i) {
    colors.push({
      path: createHuePath(size, slices, depth, i),
      color: hslToHex(i * (360 / slices) as Hue, 100, 50),
    });
  }

  return colors;
}

export function createHarmonyWheels(color: string, slices = 16, depth = 24) {
  const [ h, s, l ] = colorValue(color).hsl;
  const colors = [];

  const arcDegree = (360 / slices);

  for (let i = 0; i < slices; ++i) {
    colors.push({
      path: createHuePath(150, slices, depth, i),
      color: hslToHex(h + i * arcDegree, s, l),
    });
  }

  return colors;
}

export function createSaturationMap(color: string, length = 10) {
  const [ h, , l ] = hexToHsl(color);
  const colors = [];

  for (let i = 0; i < length; ++i) {
    const saturation = i * (100 / length);
    const hex = hslToHex(h, saturation, l);
    colors.push(hex);
  }

  return colors.reverse();
}

export function createLightnessMap(color: string, length = 10) {
  const [ h, s ] = hexToHsl(color);
  const colors = [];

  for (let i = 0; i < length; ++i) {
    const lightness = i * (100 / length);
    const hex = hslToHex(h, s, lightness);
    colors.push(hex);
  }

  return colors.reverse();
}

export function createHueSwatches(color: string, hues = 8, lights = 16) {
  const [ , s, l ] = hexToHsl(color);

  const lightnessGroups = [];
  const saturationGroups = [];

  for (let i = 0; i < hues; ++i) {
    const lightnessGroup = [];
    const saturationGroup = [];

    const hue = i * (360 / hues);

    for (let i = 1; i <= lights; ++i) {
      const lightness = i * (90 / lights);
      lightnessGroup.push(hslToHex(hue, s, lightness));
    }

    for (let i = 0; i < lights; ++i) {
      const saturation = i * (100 / lights);
      saturationGroup.push(hslToHex(hue, saturation, l));
    }

    lightnessGroups.push(lightnessGroup.reverse());
    saturationGroups.push(saturationGroup.reverse());
  }

  return { lightness: lightnessGroups, saturation: saturationGroups };
}
