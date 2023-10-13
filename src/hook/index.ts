export type StateHook = <T>(init: T) => [ T, (value: T) => void ];
export type EffectHook = (fn: () => (void | never), deps?: unknown) => void;
export type RefHook = <T>(init?: T) => {
  current?: T;
};

let _useState: StateHook;
let _useEffect: EffectHook;
let _useRef: RefHook;

export const useState: StateHook = ((init: unknown) => {
  return _useState ? _useState(init) : init;
}) as never;
export const useEffect: EffectHook = ((fn: () => (void | never), deps?: unknown) => {
  return _useEffect ? _useEffect(fn, deps) : fn();
});
export const useRef: RefHook = ((init: unknown) => {
  return _useRef ? _useRef(init) : { current: init };
}) as never;

export function setupHook(hook: unknown, effect: unknown, ref: unknown) {
  _useState = hook as never;
  _useEffect = effect as never;
  _useRef = ref as never;
}
