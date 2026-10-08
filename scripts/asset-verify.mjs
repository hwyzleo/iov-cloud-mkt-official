/**
 * Real-browser verification (Playwright + system Chrome).
 * Asset checks for CR-MKT-OFFICIAL-DSN-002:
 * hero/vehicle images and header/footer logo load as real assets,
 * hero carries a decorative tech overlay, no stale carousel references.
 */
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

const assetState = await page.evaluate(() => {
  const heroImg = document.querySelector('.hero-visual img');
  const heroSrc = heroImg?.getAttribute('src') ?? '';
  const mark = document.querySelector('.brand-mark');
  return {
    heroSrc,
    heroNatural: heroImg ? { w: heroImg.naturalWidth, h: heroImg.naturalHeight } : null,
    heroLoaded: heroImg ? heroImg.complete && heroImg.naturalWidth > 0 : false,
    markSrc: mark?.getAttribute('src') ?? '',
    markLoaded: mark ? mark.complete && mark.naturalWidth > 0 : false,
    heroPictureHasWebp: !!document.querySelector('.hero-visual source[type="image/webp"]'),
    heroTechOverlay: !!document.querySelector('.hero-tech-overlay'),
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
    favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? '',
  };
});
const checks = [
  ['hero-uses-ai-jpeg', assetState.heroSrc.includes('hero-front-3q.jpeg'), assetState.heroSrc],
  ['hero-loaded-real-size', assetState.heroLoaded && assetState.heroNatural.w === 1600, JSON.stringify(assetState.heroNatural)],
  ['hero-picture-webp-source', assetState.heroPictureHasWebp],
  ['hero-tech-overlay-present', assetState.heroTechOverlay],
  ['header-mark-real-logo', assetState.markSrc.includes('hwyz-mark-white.png') && assetState.markLoaded, assetState.markSrc],
  ['og-image-real', assetState.ogImage.includes('hero-front-3q.webp'), assetState.ogImage],
  ['favicon-png', assetState.favicon.includes('favicon.png'), assetState.favicon],
];
let fails = 0;
for (const [n, ok, d = ''] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`);
  if (!ok) fails++;
}

// Footer logo loads as a real asset (scroll into view to trigger lazy loading).
await page.evaluate(() => document.getElementById('footer').scrollIntoView());
await page.waitForTimeout(600);
const footerMark = await page.evaluate(() => {
  const img = document.querySelector('.footer-brand img');
  return { src: img?.getAttribute('src') ?? '', loaded: img ? img.complete && img.naturalWidth > 0 : false };
});
const footerOk = footerMark.src.includes('hwyz-mark-white.png') && footerMark.loaded;
console.log(`${footerOk ? 'PASS' : 'FAIL'}  footer-mark-real-logo  (${footerMark.src}, loaded=${footerMark.loaded})`);
if (!footerOk) fails++;

// No stale vehicle-thumbnail carousel in the DOM (DSN-002 removed it).
const staleCarousel = await page.evaluate(() => ({
  productStage: !!document.getElementById('product-stage'),
  productThumbs: document.querySelectorAll('.product-thumb').length,
}));
const carouselOk = !staleCarousel.productStage && staleCarousel.productThumbs === 0;
console.log(`${carouselOk ? 'PASS' : 'FAIL'}  no-stale-product-carousel  (stage=${staleCarousel.productStage} thumbs=${staleCarousel.productThumbs})`);
if (!carouselOk) fails++;

// Vehicle block uses a single lazy-loaded main image.
const vehicleImg = await page.evaluate(() => {
  const img = document.querySelector('.vehicle-main img');
  return { src: img?.getAttribute('src') ?? '', loading: img?.getAttribute('loading') ?? '' };
});
const vehicleOk = vehicleImg.src.includes('hero-front-3q') && vehicleImg.loading === 'lazy';
console.log(`${vehicleOk ? 'PASS' : 'FAIL'}  vehicle-single-lazy-main-image  (${vehicleImg.src}, loading=${vehicleImg.loading})`);
if (!vehicleOk) fails++;

// Hero edge feather mask still applied.
const maskCheck = await page.evaluate(() => {
  const img = document.querySelector('.hero-visual img');
  return img ? getComputedStyle(img).maskImage || getComputedStyle(img).webkitMaskImage : '';
});
console.log(`${maskCheck.includes('radial-gradient') ? 'PASS' : 'FAIL'}  hero-edge-feather-mask  (${maskCheck.slice(0, 50)}...)`);
if (!maskCheck.includes('radial-gradient')) fails++;

await page.screenshot({ path: 'artifacts/hero-real.png', clip: { x: 0, y: 0, width: 1280, height: 800 } });
await page.evaluate(() => window.scrollTo(0, document.getElementById('vehicle').offsetTop));
await page.waitForTimeout(800);
await page.screenshot({ path: 'artifacts/product-real.png', fullPage: false });

console.log(fails === 0 ? '\nALL ASSET CHECKS PASS' : `\n${fails} FAILURES`);
await browser.close();
process.exit(fails ? 1 : 0);
