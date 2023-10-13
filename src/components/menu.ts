import { arrows, escape, type Escaper } from '../utils/index.js';
import type { DirectionX, DirectionY } from './popup.js';
import { logger } from '@beerush/utils';

export type MenuOptions = {
  type?: MenuType;
  open?: boolean;
  portal?: string | HTMLElement;
  backdrop?: boolean;
}
export type TriggerOptions = {
  type?: MenuType;
  xDir?: DirectionX;
  yDir?: DirectionY;
  debounce?: number;
}

export type MenuInit = (element: HTMLElement, options?: MenuOptions) => {
  update: () => void;
  destroy: () => void;
};

export type MenuTrigger = (element: HTMLElement, options?: TriggerOptions) => {
  update: (options?: TriggerOptions) => void;
  destroy: () => void
};

export type MenuItem = (element: HTMLElement, value: unknown) => {
  update: (data: unknown) => void;
  destroy: () => void;
};

export enum MenuEventType {
  OPEN = 'menu-open',
  CLOSE = 'menu-close',
  SELECT = 'menu-select',
}

export enum MenuType {
  CONTEXT = 'context',
  DROPDOWN = 'dropdown',
}

export const MenuTpl = {
  Context: { type: MenuType.CONTEXT, backdrop: true } as MenuOptions,
  Dropdown: { type: MenuType.DROPDOWN, backdrop: true } as MenuOptions,
};

export type MenuEventListener = (e: CustomEvent) => void;

export type MenuState = {
  opened: boolean;
  type: MenuType;
  menu: MenuInit;
  trigger: MenuTrigger;
  item: MenuItem;
  open: (e?: MouseEvent) => void;
  close: (e?: MouseEvent) => void;

  addEventListener: (type: MenuEventType, cb: MenuEventListener) => void;
  removeEventListener: (type: MenuEventType, cb: MenuEventListener) => void;
};

export function createMenu(options?: MenuOptions): MenuState {
  let {
    type: menuType = MenuType.DROPDOWN,
    backdrop = false,
    portal = '.menu-portal',
  } = (options || {} as MenuOptions);

  let root: HTMLElement;
  let button: HTMLElement;

  const items: HTMLElement[] = [];
  const valueMap = new Map<HTMLElement, unknown>();

  const getListenType = () => menuType === 'context' ? 'contextmenu' : 'click';

  const dispatch = (type: MenuEventType, detail?: unknown) => {
    root?.dispatchEvent(new CustomEvent(type, {
      detail,
      bubbles: true,
      cancelable: true,
      composed: true,
    }));

    logger.debug(`[menu] Event dispatched: ${ type }`);
  };

  const menu: MenuInit = (element: HTMLElement, menuOptions?: MenuOptions) => {
    if (menuOptions) {
      menuType = menuOptions.type || menuType;
      backdrop = menuOptions.backdrop || backdrop;
      portal = menuOptions.portal || portal;
      state.type = menuType;
    }

    root = element;

    const keydown = (e: KeyboardEvent) => {
      if (!root || !state.opened) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();

        const i = items.indexOf(e.target as HTMLElement);
        const prev = items[i - 1];

        if (prev) {
          prev.focus();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopImmediatePropagation();

        const i = items.indexOf(e.target as HTMLElement);
        const next = items[i + 1];

        if (next) {
          next.focus();
        }
      }
    };

    const hook = arrows(element, keydown);
    logger.debug('[menu] Menu created.');

    return {
      update: (newOptions?: MenuOptions) => {
        menuType = newOptions?.type ?? menuType;
        backdrop = newOptions?.backdrop ?? backdrop;
        portal = newOptions?.portal ?? portal;
        state.type = menuType;
      },
      destroy: () => {
        hook?.destroy?.();
      },
    };
  };

  const trigger: MenuTrigger = (element: HTMLElement, opt?: TriggerOptions) => {
    if (opt?.type) {
      menuType = opt.type;
      state.type = menuType;
    }

    button = element;
    button.addEventListener(getListenType(), open);

    logger.debug('[menu] Trigger created.');

    return {
      update: (newOpt?: TriggerOptions) => {
        if (newOpt?.type) {
          button.removeEventListener(getListenType(), open);

          menuType = newOpt.type;
          state.type = menuType;

          button.addEventListener(getListenType(), open);
        }
      },
      destroy: () => {
        button.removeEventListener(getListenType(), open);
      },
    };
  };

  const item: MenuItem = (element: HTMLElement, value: unknown) => {
    items.push(element);
    valueMap.set(element, value);

    const itemMouseUp = (e: MouseEvent) => {
      select(e, value);
    };

    const itemKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Space') {
        select(e, value);
      }
    };

    element.addEventListener('mouseup', itemMouseUp);
    element.addEventListener('keydown', itemKeydown);

    logger.debug('[menu] Menu item added.');

    return {
      update: (val: unknown) => {
        valueMap.set(element, val);
      },
      destroy: () => {
        valueMap.delete(element);

        if (items.includes(element)) {
          items.splice(items.indexOf(element), 1);
        }

        element.removeEventListener('mouseup', itemMouseUp);
        element.removeEventListener('keydown', itemKeydown);
      },
    };
  };

  const select = (e: MouseEvent | KeyboardEvent, data?: unknown) => {
    if (!root) return;

    dispatch(MenuEventType.SELECT, data || valueMap.get(e.target as HTMLElement));
    close();
  };

  let escaper: Escaper | void;
  let parent: HTMLElement | void;
  let backdropElement: HTMLElement | void;

  const open = (e?: MouseEvent) => {
    if (!root) return;

    state.opened = true;
    parent = root.parentElement as HTMLElement;

    let target: HTMLElement = (typeof (portal as string) === 'string'
                               ? document.querySelector(portal as string)
                               : portal) as HTMLElement;

    if (!target) {
      target = document.createElement('div');
      target.classList.add('menu-portal');
      document.body.appendChild(target);
    }

    if (backdrop) {
      backdropElement = document.createElement('div');
      backdropElement.classList.add('menu-backdrop');
      backdropElement.addEventListener('click', close);

      target.appendChild(backdropElement);
      logger.debug('[menu] Backdrop added.');
    }

    target.appendChild(root);
    root.focus();

    if (menuType === MenuType.CONTEXT) {
      e?.preventDefault();
      e?.stopPropagation();

      const { width, height } = root.getBoundingClientRect();
      const { clientX: x, clientY: y } = e || { clientX: 0, clientY: 0 };

      root.style.left = `${ x + width > innerWidth ? innerWidth - width : x }px`;
      root.style.top = `${ y + height > innerHeight ? innerHeight - height : y }px`;

      logger.debug('[menu] Context menu opened.');
    } else if (menuType === MenuType.DROPDOWN) {
      logger.debug('[menu] Dropdown menu opened.');
    }

    escaper = escape(root);
    escaper.subscribe(close);

    dispatch(MenuEventType.OPEN);
  };

  const close = () => {
    if (!root) return;

    state.opened = false;

    (parent as HTMLElement)?.appendChild(root);
    (escaper as Escaper)?.destroy();
    (backdropElement as HTMLElement)?.remove();

    escaper = undefined;
    parent = undefined;

    dispatch(MenuEventType.CLOSE);
  };

  const addEventListener = (type: MenuEventType, cb: MenuEventListener) => {
    root.addEventListener(type as never, cb);
  };
  const removeEventListener = (type: MenuEventType, cb: MenuEventListener) => {
    root.removeEventListener(type as never, cb);
  };

  const state = {
    type: menuType,
    opened: options?.open ?? false,
    menu,
    trigger,
    item,
    open,
    close,
    addEventListener,
    removeEventListener,
  };

  return state;
}
