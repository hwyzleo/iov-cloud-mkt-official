/**
 * Mobile drawer menu: toggles `.is-open` on the nav, mirrors state to the
 * toggle button (aria-expanded), closes on link click, Escape, and when the
 * viewport grows back to desktop width.
 */
export function initMobileMenu(menuToggle: HTMLButtonElement, nav: HTMLElement): void {
  const close = (): void => {
    nav.classList.remove('is-open');
    menuToggle.classList.remove('is-active');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开菜单');
    document.body.classList.remove('menu-open');
  };

  const open = (): void => {
    nav.classList.add('is-open');
    menuToggle.classList.add('is-active');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', '关闭菜单');
    document.body.classList.add('menu-open');
  };

  menuToggle.addEventListener('click', () => {
    if (nav.classList.contains('is-open')) close();
    else open();
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) close();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) close();
  });
}
