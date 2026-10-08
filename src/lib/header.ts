/**
 * Header scroll state: toggles `.is-scrolled` so the transparent header
 * switches to a frosted dark background once the page is scrolled.
 */
export function initHeaderScroll(header: HTMLElement): void {
  const update = (): void => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}
