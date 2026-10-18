const pressedClass = "is-pressed";

let pressedControl: HTMLElement | null = null;
let pressedPointerId: number | null = null;

export function markPressed(control: HTMLElement): void {
  control.classList.add(pressedClass);
}

export function submitButton(form: HTMLFormElement): HTMLButtonElement | null {
  const button = form.querySelector("button[type='submit']");
  return button instanceof HTMLButtonElement ? button : null;
}

export function beginPendingSubmit(button: HTMLButtonElement, pendingLabel: string): void {
  if (button.dataset.submitLabel === undefined) {
    button.dataset.submitLabel = button.textContent ?? "";
  }
  markPressed(button);
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = pendingLabel;
}

export function restoreSubmit(button: HTMLButtonElement, keepDisabled = false): void {
  const label = button.dataset.submitLabel;
  button.removeAttribute("aria-busy");
  button.classList.remove(pressedClass);
  if (label !== undefined) button.textContent = label;
  button.disabled = keepDisabled;
}

export function releasePressedControl(control: HTMLElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      releaseIfIdle(control);
    });
  });
}

function releaseIfIdle(control: HTMLElement): void {
  if (control.getAttribute("aria-busy") === "true") return;
  if (control.dataset.navPending === "true") return;
  control.classList.remove(pressedClass);
  if (pressedControl === control) pressedControl = null;
}

function controlFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const found = target.closest("a[href], button, summary");
  if (!(found instanceof HTMLElement)) return null;
  if (found instanceof HTMLButtonElement && found.disabled) return null;
  if (found.getAttribute("aria-disabled") === "true") return null;
  return found;
}

function keyControl(target: EventTarget | null): HTMLElement | null {
  if (
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement ||
    (target instanceof HTMLElement && target.tagName === "SUMMARY")
  ) {
    return controlFrom(target);
  }
  return null;
}

function isActivationKey(event: KeyboardEvent, control: HTMLElement): boolean {
  if (event.key === "Enter") return true;
  if (event.key === " " || event.key === "Spacebar") return !(control instanceof HTMLAnchorElement);
  return false;
}

function plainPrimaryClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function isDocumentNavigation(anchor: HTMLAnchorElement, event: MouseEvent): boolean {
  if (!plainPrimaryClick(event)) return false;
  if (anchor.hasAttribute("download")) return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  const raw = anchor.getAttribute("href");
  if (!raw || raw.startsWith("javascript:")) return false;
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
  return true;
}

function progressBar(): HTMLElement | null {
  const bar = document.getElementById("nav-progress");
  return bar instanceof HTMLElement ? bar : null;
}

function startProgress(): void {
  const bar = progressBar();
  if (!bar || bar.dataset.state === "active") return;
  bar.dataset.state = "active";
}

function stopProgress(): void {
  const bar = progressBar();
  if (!bar) return;
  bar.dataset.state = "idle";
}

function onClick(event: MouseEvent): void {
  const control = controlFrom(event.target);
  if (!control) return;
  markPressed(control);
  if (control instanceof HTMLAnchorElement && isDocumentNavigation(control, event)) {
    control.dataset.navPending = "true";
    startProgress();
    return;
  }
  releasePressedControl(control);
}

function onClickCancelled(event: MouseEvent): void {
  if (!event.defaultPrevented) return;
  const control = controlFrom(event.target);
  if (!(control instanceof HTMLAnchorElement) || control.dataset.navPending !== "true") return;
  delete control.dataset.navPending;
  stopProgress();
  releaseIfIdle(control);
}

function resetAfterNavigation(): void {
  stopProgress();
  document.querySelectorAll<HTMLButtonElement>("button[aria-busy='true']").forEach((button) => {
    restoreSubmit(button, false);
  });
  document.querySelectorAll<HTMLElement>(`.${pressedClass}`).forEach((control) => {
    control.classList.remove(pressedClass);
    delete control.dataset.navPending;
  });
  pressedControl = null;
  pressedPointerId = null;
}

export function bindClickFeedback(): void {
  const root = document.documentElement;
  if (root.dataset.clickFeedback === "on") return;
  root.dataset.clickFeedback = "on";

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      const control = controlFrom(event.target);
      if (!control) return;
      markPressed(control);
      pressedControl = control;
      pressedPointerId = event.pointerId;
    },
    true,
  );

  document.addEventListener(
    "pointerup",
    (event) => {
      if (pressedPointerId !== event.pointerId) return;
      const control = pressedControl;
      pressedPointerId = null;
      pressedControl = null;
      if (!control) return;
      const inside = event.target instanceof Node && control.contains(event.target);
      if (!inside) releaseIfIdle(control);
    },
    true,
  );

  document.addEventListener(
    "pointercancel",
    (event) => {
      if (pressedPointerId !== event.pointerId) return;
      const control = pressedControl;
      pressedPointerId = null;
      pressedControl = null;
      if (control) releaseIfIdle(control);
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const control = keyControl(event.target);
      if (!control || !isActivationKey(event, control)) return;
      markPressed(control);
    },
    true,
  );

  document.addEventListener(
    "keyup",
    (event) => {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
      const control = keyControl(event.target);
      if (!control) return;
      releasePressedControl(control);
    },
    true,
  );

  document.addEventListener("click", onClick, true);
  document.addEventListener("click", onClickCancelled);
  window.addEventListener("pageshow", resetAfterNavigation);
}
