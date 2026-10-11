type Attrs = Record<string, string>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

export function setText(node: HTMLElement, value: string) {
  if (node.textContent !== value) node.textContent = value;
}

export function setClass(node: Element, name: string, on: boolean) {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}

export function setHidden(node: HTMLElement, hidden: boolean) {
  if (node.hidden !== hidden) node.hidden = hidden;
}

export function setAttr(node: Element, name: string, value: string) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

export function formatLb(lb: number) {
  return `${lb.toFixed(1)} lb`;
}

export function releaseFocus(node: HTMLElement) {
  const active = document.activeElement;
  if (active instanceof HTMLElement && node.contains(active)) active.blur();
}

export function stopAll(node: HTMLElement) {
  const stop = (event: Event) => event.stopPropagation();
  for (const type of ["pointerdown", "pointermove", "click", "keydown", "keyup", "touchstart", "mousedown"]) {
    node.addEventListener(type, stop);
  }
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  return nodes.filter((node) => node.closest("[hidden]") === null);
}

export function trapFocus(container: HTMLElement) {
  container.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const nodes = focusable(container);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !(active instanceof HTMLElement) || !container.contains(active)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
      return;
    }
    if (active === last || !(active instanceof HTMLElement) || !container.contains(active)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });
}

export function setInert(node: HTMLElement, inert: boolean) {
  if (node.inert !== inert) node.inert = inert;
}
