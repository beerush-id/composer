import { KebabCase } from '@beerush/utils';

export const CSS_UNIT_REGEX = /(\d+)(px|pc|pt|mm|cm|in)/ig;
export const CSS_SINGLE_UNIT_REGEX = /(\d+)(px|pc|pt|mm|cm|in)/i;
export const CSS_UNIT_MAP = [
  {
    search: /^rotate/,
    unit: 'deg',
  },
  {
    search: /^scale/,
    unit: '',
  },
];

export type CSSProperties = Partial<
  {
    [K in KebabCase<keyof CSSStyleDeclaration>]: string | number;
  } &
  {
    [K in keyof CSSStyleDeclaration]: string | number;
  } &
  {
    [key: `--${ string }`]: string | number;
  }
>;

export type CSSStyles = {
  [K in keyof CSSStyleDeclaration]: number | string;
} & {
  [key: `--${ string }`]: number | string;
};

export function toCssUnit(key: keyof CSSProperties, value: string | number, scale = 1): string {
  if (typeof value === 'string') {
    const values = value.match(CSS_UNIT_REGEX);

    if (values) {
      values.forEach(v => {
        const [ , num, unit ] = v.match(CSS_SINGLE_UNIT_REGEX) as RegExpMatchArray;
        value = (value as string).replace(v, `${ parseFloat(num) * scale }${ unit }`);
      });
    }

    return value;
  }

  const unit = CSS_UNIT_MAP.find(({ search }) => search.test(key as string));

  if (unit) {
    return unit.unit ? `${ value * scale }` : `${ value }${ unit.unit }`;
  }

  if ((value > 0 || value < 0)) {
    return `${ value * scale }px`;
  }

  return `${ value * scale }`;
}
