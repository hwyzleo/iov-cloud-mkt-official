/**
 * Product stage: switches the main vehicle image when a thumbnail is
 * selected, mirroring state via `aria-pressed`.
 */
export function initProductStage(root: HTMLElement): void {
  const mainImage = root.querySelector<HTMLImageElement>('#product-main-image');
  const thumbs = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-src]'));
  if (!mainImage || thumbs.length === 0) return;

  const select = (thumb: HTMLButtonElement): void => {
    const src = thumb.getAttribute('data-src') ?? '';
    if (src === '') return;
    mainImage.src = src;
    // When the image sits inside a <picture>, the browser prioritises the
    // <source> srcset — keep it in sync or the main image would not change.
    const picture = mainImage.closest('picture');
    const source = picture?.querySelector('source');
    if (source) source.setAttribute('srcset', src);
    mainImage.alt = thumb.getAttribute('data-alt') ?? mainImage.alt;
    for (const candidate of thumbs) {
      const active = candidate === thumb;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    }
  };

  thumbs.forEach((thumb) => thumb.addEventListener('click', () => select(thumb)));
}
