/**
 * Real-browser verification (Playwright + system Chrome).
 * Checks: 3 viewports have no horizontal overflow, anchors work,
 * drawer menu works, product thumbs switch, form validation works.
 */
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4173/';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 375, height: 812 },
];

const failures = [];
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (!ok) failures.push(`${name} ${detail}`.trim());
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  // ---- 1. Responsive layout: no horizontal overflow ----
  const page = await browser.newPage();
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no-horizontal-overflow:${vp.name}`, overflow <= 0, `overflow=${overflow}px`);
    await page.screenshot({ path: `artifacts/shot-${vp.name}.png`, fullPage: false });
  }

  // ---- 2. Header scroll state ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const scrolled = await page.evaluate(async () => {
    window.scrollTo(0, 300);
    await new Promise((r) => setTimeout(r, 100));
    return document.getElementById('site-header')?.classList.contains('is-scrolled');
  });
  check('header-frosts-on-scroll', scrolled === true);

  // ---- 3. Anchor navigation ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const anchorTarget = await page.evaluate(async () => {
    document.querySelector('a[href="#product"]')?.click();
    await new Promise((r) => setTimeout(r, 2000));
    const product = document.getElementById('product');
    return { inView: product ? product.getBoundingClientRect().top : null, top: product?.offsetTop ?? -1 };
  });
  check('anchor-navigates-to-product', anchorTarget.inView !== null && anchorTarget.inView < 400,
    `top=${anchorTarget.top} viewportTop=${anchorTarget.inView}`);

  // ---- 4. Hero CTAs ----
  const ctaHrefs = await page.$$eval('.hero-actions a', (els) => els.map((e) => e.getAttribute('href')));
  check('hero-cta-pair', JSON.stringify(ctaHrefs) === JSON.stringify(['#product', '#contact']),
    JSON.stringify(ctaHrefs));

  // ---- 5. Mobile drawer menu ----
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('#menu-toggle');
  const menuOpen = await page.evaluate(() => document.getElementById('site-nav')?.classList.contains('is-open'));
  check('mobile-menu-opens', menuOpen === true);
  await page.keyboard.press('Escape');
  const menuClosed = await page.evaluate(() => document.getElementById('site-nav')?.classList.contains('is-open'));
  check('mobile-menu-closes-on-escape', menuClosed === false);

  // ---- 6. Product thumb switching ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('button[data-src*="exterior-side"]');
  const switchedSrc = await page.getAttribute('#product-main-image', 'src');
  check('product-thumb-switches-image', (switchedSrc ?? '').includes('exterior-side'), switchedSrc ?? '');

  // ---- 7. Contact form: empty submit shows errors ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('#contact-form button[type="submit"]');
  const nameErr = await page.textContent('#f-name-error');
  check('form-required-error', (nameErr ?? '').includes('称呼'), nameErr ?? '');

  // ---- 8. Contact form: valid submit succeeds in demo mode ----
  await page.fill('#f-name', '王小雅');
  await page.fill('#f-contact', 'wang@example.com');
  await page.selectOption('#f-interest', '产品咨询');
  await page.click('#contact-form button[type="submit"]');
  await page.waitForSelector('#form-status.is-success', { timeout: 3000 });
  const statusText = await page.textContent('#form-status');
  check('form-demo-success', (statusText ?? '').includes('提交成功'), statusText ?? '');

  // ---- 9. ICP filing number visible ----
  const icp = await page.textContent('.footer-icp');
  check('footer-icp-verbatim', (icp ?? '').trim() === '沪ICP备2026047005号-1', icp ?? '');

  // ---- 10. prefers-reduced-motion: hero visible without animation ----
  const reducedPage = await browser.newPage({ reducedMotion: 'reduce' });
  await reducedPage.setViewportSize({ width: 1280, height: 800 });
  await reducedPage.goto(BASE, { waitUntil: 'networkidle' });
  const heroOpacity = await reducedPage.evaluate(() => {
    const title = document.querySelector('.hero-title');
    return title ? getComputedStyle(title).opacity : null;
  });
  check('reduced-motion-hero-visible', heroOpacity === '1', `opacity=${heroOpacity}`);

  // ---- 11. SEO head ----
  const seo = await reducedPage.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    og: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
  }));
  check('seo-title-has-model-brand-site', /寒川03/.test(seo.title) && /HWYZ/.test(seo.title) && /寒雅车载技术研习录/.test(seo.title), seo.title);
  check('seo-description', seo.desc.length > 10 && seo.desc.length <= 160, `len=${seo.desc.length}`);
  check('seo-og', seo.og.length > 0, seo.og);

  await reducedPage.close();
} catch (error) {
  console.error('SCRIPT ERROR:', error);
  failures.push(String(error));
} finally {
  await browser.close();
}

console.log('\n==============================');
console.log(`Total: ${results.length} checks, Failures: ${failures.length}`);
if (failures.length > 0) {
  console.log('FAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
