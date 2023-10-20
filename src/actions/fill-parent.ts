export type FillParentOptions = {
  width?: boolean;
  height?: boolean;
  siblings?: boolean;
};

export function fillParent(
  self: HTMLElement,
  options: FillParentOptions = { height: true, width: true, siblings: true },
) {
  if (!self.parentElement || !(self.parentElement instanceof HTMLElement)) {
    throw new Error('Element must have a parent to fill!');
  }

  const parent = self.parentElement;
  const observer = new ResizeObserver(() => update());

  observer.observe(parent);

  const update = (newOptions?: FillParentOptions) => {
    if (newOptions) {
      options = newOptions;
    }

    const { width: parentWidth, height: parentHeight } = parent.getBoundingClientRect();
    const siblings = parent.children;

    let height = parentHeight;
    let width = parentWidth;

    for (let i = 0; i < siblings.length; ++i) {
      if (siblings[i] !== self) {
        observer.observe(siblings[i]);
        height -= siblings[i].getBoundingClientRect().height;
        width -= siblings[i].getBoundingClientRect().width;
      }
    }

    if (options.width) {
      self.style.width = `${ width }px`;
    }

    if (options.height) {
      self.style.height = `${ height }px`;
    }
  };

  update();

  return {
    update,
    destroy: () => {
      observer.disconnect();
    },
  };
}

export function fillHeight(self: HTMLElement, siblings = true) {
  return fillParent(self, { height: true, siblings });
}

export function fillWidth(self: HTMLElement, siblings = true) {
  return fillParent(self, { width: true, siblings });
}
