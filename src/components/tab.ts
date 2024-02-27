import { session, State } from '@beerush/anchor';
import { logger } from '@beerush/utils';

export type TabOptions = {
  active?: TabId;
  vertical?: boolean;
  reversed?: boolean;
  compact?: boolean;
  allowEmpty?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export type TabId = number | string;

export class Tab {
  public active: TabId;

  private items = new Map<TabId, HTMLElement>();
  private buttons = new Map<TabId, HTMLElement>();
  private buttonSubscriptions = new Set<() => void>();

  constructor(public name: string, public options: TabOptions = {}) {
    this.active = options?.active ?? -1;
  }

  public createButtonId(): TabId {
    const id = this.buttons.size;
    this.buttons.set(this.buttons.size, null as never);
    return id;
  }

  public createItemId(): TabId {
    const id = this.items.size;
    this.items.set(id, null as never);
    return id;
  }

  public item(element: HTMLElement, id: TabId = this.createItemId()) {
    id = parseId(id);
    this.items.set(id, element);

    if (id !== this.active) {
      element.setAttribute('hidden', '');
    }

    logger.debug(`[tab:${ this.name }] Tab item ${ id } initialized.`);

    return {
      update: (newId: TabId) => {
        newId = parseId(newId);
        this.items.delete(id);
        this.items.set(newId, element);
        id = newId;
      },
      destroy: () => {
        this.items.delete(id);
        logger.debug(`[tab:${ this.name }] Tab item ${ id } destroyed.`);
      },
    };
  }

  public button(element: HTMLElement, id: TabId = this.createButtonId()) {
    id = parseId(id);
    this.buttons.set(id, element);

    if (this.active === -1) {
      this.active = id;
    }

    if (id === this.active) {
      element.setAttribute('aria-selected', 'true');
      element.classList.add('active');
    }

    const activate = () => this.activate(id);
    const unsubscribe = () => element.removeEventListener('click', activate);

    element.addEventListener('click', activate);
    this.buttonSubscriptions.add(unsubscribe);
    logger.debug(`[tab:${ this.name }] Tab button ${ id } initialized.`);

    return {
      update: (newId: TabId) => {
        newId = parseId(newId);
        this.buttons.delete(id);
        this.buttons.set(newId, element);
        id = newId;
      },
      destroy: () => {
        element.removeEventListener('click', activate);
        this.buttons.delete(id);
        this.buttonSubscriptions.delete(unsubscribe);
        logger.debug(`[tab:${ this.name }] Tab button ${ id } destroyed.`);
      },
    };
  }

  public activate(id: TabId) {
    this.active = this.active === id && this.options?.allowEmpty ? -1 : id;

    for (const [ i, btn ] of this.buttons) {
      if (i === this.active) {
        btn.setAttribute('aria-selected', 'true');
        btn.classList.add('active');
      } else {
        btn.setAttribute('aria-selected', 'false');
        btn.classList.remove('active');
      }
    }

    for (const [ i, elem ] of this.items) {
      if (i === this.active) {
        elem?.removeAttribute('hidden');
      } else {
        elem?.setAttribute('hidden', '');
      }
    }
  }

  public update(options?: TabOptions) {
    Object.assign(this.options, options || {});
  }

  public destroy() {
    this.items.clear();
    this.buttons.clear();

    for (const unsubscribe of this.buttonSubscriptions) {
      unsubscribe();
    }
  }
}

export function createTab(name = 'global-tab', options?: TabOptions): State<Tab> {
  return session(name, () => {
    return new Tab(name, options) as never;
  });
}

export function parseId(id: TabId): TabId {
  if (typeof id === 'string') {
    return parseInt(id) || id;
  }

  return id;
}
