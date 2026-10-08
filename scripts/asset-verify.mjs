import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

const assetState = await page.evaluate(() => {
  const heroImg = document.querySelector('.hero-visual img');
  const heroSrc = heroImg?.getAttribute('src') ?? '';
  const mark = document.querySelector('.brand-mark');
  const lockup = document.querySelector('.footer-brand img');
  return {
    heroSrc,
    heroNatural: heroImg ? { w: heroImg.naturalWidth, h: heroImg.naturalHeight } : null,
    heroLoaded: heroImg ? heroImg.complete && heroImg.naturalWidth > 0 : false,
    markSrc: mark?.getAttribute('src') ?? '',
    markLoaded: mark ? mark.complete && mark.naturalWidth > 0 : false,
    lockupSrc: lockup?.getAttribute('src') ?? '',
    lockupLoaded: lockup ? lockup.complete && lockup.naturalWidth > 0 : false,
    heroPictureHasWebp: !!document.querySelector('.hero-visual source[type="image/webp"]'),
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
    favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? '',
  };
});
const checks = [
  ['hero-uses-ai-jpeg', assetState.heroSrc.includes('hero-front-3q.jpeg'), assetState.heroSrc],
  ['hero-loaded-real-size', assetState.heroLoaded && assetState.heroNatural.w === 1600, JSON.stringify(assetState.heroNatural)],
  ['hero-picture-webp-source', assetState.heroPictureHasWebp],
  ['header-mark-real-logo', assetState.markSrc.includes('hwyz-mark-white.png') && assetState.markLoaded, assetState.markSrc],
  ['footer-lockup-real-logo', assetState.lockupSrc.includes('hwyz-lockup-white.png'), assetState.lockupSrc],
  ['og-image-real', assetState.ogImage.includes('hero-front-3q.webp'), assetState.ogImage],
  ['favicon-png', assetState.favicon.includes('favicon.png'), assetState.favicon],
];
let fails = 0;
for (const [n, ok, d = ''] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`);
  if (!ok) fails++;
}

// All four view angles served as webp
const thumbCheck = await page.evaluate(() => {
  const thumbs = Array.from(document.querySelectorAll('.product-thumb'));
  return thumbs.map((t) => t.getAttribute('data-src'));
});
const expectedThumbs = [
  'hero-front-3q.webp', 'exterior-front.webp', 'exterior-side.webp', 'exterior-rear.webp',
];
const allAnglesOk = expectedThumbs.every((name) => thumbCheck.some((src) => src.includes(name)));
console.log(`${allAnglesOk ? 'PASS' : 'FAIL'}  four-view-webp-thumbs  (${thumbCheck.join(', ')})`);
if (!allAnglesOk) fails++;

// Switch to each view, confirm the main image follows AND the browser
// actually renders the new resource (currentSrc), not just the attribute.
for (const name of ['exterior-front', 'exterior-side', 'exterior-rear', 'hero-front-3q']) {
  await page.click(`button[data-src*="${name}"]`);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const img = document.getElementById('product-main-image');
    return {
      src: img?.getAttribute('src') ?? '',
      currentSrc: img?.currentSrc ?? '',
      sourceSrcset: img?.closest('picture')?.querySelector('source')?.getAttribute('srcset') ?? '',
    };
  });
  const ok = state.src.includes(name) && state.sourceSrcset.includes(name) && state.currentSrc.includes(name);
  console.log(`${ok ? 'PASS' : 'FAIL'}  thumb-switch-${name}  (current=${state.currentSrc})`);
  if (!ok) fails++;
}

// Cyan rim light present on hero composite?
await page.screenshot({ path: 'artifacts/hero-real.png', clip: { x: 0, y: 0, width: 1280, height: 800 } });
await page.evaluate(() => window.scrollTo(0, document.getElementById('product').offsetTop));
await page.waitForTimeout(800);
await page.screenshot({ path: 'artifacts/product-real.png', fullPage: false });

const maskCheck = await page.evaluate(() => {
  const img = document.querySelector('.hero-visual img');
  return img ? getComputedStyle(img).maskImage || getComputedStyle(img).webkitMaskImage : '';
});
console.log(`${maskCheck.includes('radial-gradient') ? 'PASS' : 'FAIL'}  hero-edge-feather-mask  (${maskCheck.slice(0, 50)}...)`);
if (!maskCheck.includes('radial-gradient')) fails++;

console.log(fails === 0 ? '\nALL ASSET CHECKS PASS' : `\n${fails} FAILURES`);
await browser.close();
process.exit(fails ? 1 : 0);
