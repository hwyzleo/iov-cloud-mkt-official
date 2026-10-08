/**
 * Active nav highlight: marks the nav link of the section currently in the
 * middle band of the viewport with `.is-active` / `aria-current="true"`.
 */
export function initActiveNav(nav: HTMLElement): void {
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[data-nav]'));
  if (links.length === 0 || typeof IntersectionObserver === 'undefined') return;

  const sections = links
    .map((link) => document.querySelector<HTMLElement>(link.getAttribute('href') ?? ''))
    .filter((section): section is HTMLElement => section !== null);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const activeHref = `#${entry.target.id}`;
        for (const link of links) {
          const isActive = link.getAttribute('href') === activeHref;
          link.classList.toggle('is-active', isActive);
          if (isActive) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
  );

  sections.forEach((section) => observer.observe(section));
}
