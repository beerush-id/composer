export enum Mouse {
  Left = 0,
  Middle = 1,
  Right = 2,
}

export function isLeftClick(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent) {
    return e.button === Mouse.Left;
  } else if (e instanceof TouchEvent) {
    return e.touches.length === 1;
  }

  return false;
}

export function isMiddleClick(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent) {
    return e.button === Mouse.Middle;
  } else if (e instanceof TouchEvent) {
    return e.touches.length === 2;
  }

  return false;
}

export function isRightClick(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent) {
    return e.button === Mouse.Right;
  } else if (e instanceof TouchEvent) {
    return e.touches.length === 3;
  }

  return false;
}
