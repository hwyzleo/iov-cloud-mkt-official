/**
 * Reveal-on-scroll: adds `.is-visible` to `.reveal` elements when they enter
 * the viewport. Fails safe to fully visible when IntersectionObserver is
 * unavailable or when the user prefers reduced motion (CSS handles the latter).
 */
export function initReveal(root: ParentNode = document): void {
  const targets = root.querySelectorAll<HTMLElement>('.reveal');
  if (targets.length === 0) return;

  if (typeof IntersectionObserver === 'undefined') {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );

  targets.forEach((el) => observer.observe(el));
}
