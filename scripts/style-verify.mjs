import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({name, ok}); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

// Desktop: tokens
const desktop = await page.evaluate(() => {
  const cs = (sel) => getComputedStyle(document.querySelector(sel));
  return {
    bodyBg: cs('body').backgroundColor,
    ctaBg: cs('.btn-primary').backgroundColor,
    heroTitle: cs('.hero-title').fontSize,
    cardBorder: cs('.capability-card').borderTopColor,
    cardRadius: cs('.capability-card').borderRadius,
    gridCols: getComputedStyle(document.querySelector('.capability-grid')).gridTemplateColumns.split(' ').length,
    icp: document.querySelector('.footer-icp').textContent.trim(),
    heroMinH: cs('.hero').minHeight,
  };
});
check('token-bg-primary', desktop.bodyBg === 'rgb(8, 10, 13)', desktop.bodyBg);
check('token-accent-cyan-cta', desktop.ctaBg === 'rgb(101, 244, 213)', desktop.ctaBg);
check('hero-title-64-88px', parseInt(desktop.heroTitle) >= 64 && parseInt(desktop.heroTitle) <= 88, desktop.heroTitle);
check('card-border-low-contrast', desktop.cardBorder === 'rgba(255, 255, 255, 0.12)', desktop.cardBorder);
check('card-radius-16-24px', parseInt(desktop.cardRadius) >= 16 && parseInt(desktop.cardRadius) <= 24, desktop.cardRadius);
check('desktop-12col-grid', desktop.gridCols === 12, `cols=${desktop.gridCols}`);
check('hero-min-90vh', desktop.heroMinH === '720px', desktop.heroMinH);
check('icp-verbatim', desktop.icp === '沪ICP备2026047005号-1', desktop.icp);

// Tablet: 8 cols
await page.setViewportSize({ width: 1024, height: 768 });
await page.reload({ waitUntil: 'networkidle' });
const tabletCols = await page.evaluate(() => getComputedStyle(document.querySelector('.capability-grid')).gridTemplateColumns.split(' ').length);
check('tablet-8col-grid', tabletCols === 8, `cols=${tabletCols}`);

// Mobile: 4 cols, single column cards, hero title 40-52
await page.setViewportSize({ width: 375, height: 812 });
await page.reload({ waitUntil: 'networkidle' });
const mobile = await page.evaluate(() => {
  const cs = (sel) => getComputedStyle(document.querySelector(sel));
  return {
    gridCols: getComputedStyle(document.querySelector('.capability-grid')).gridTemplateColumns.split(' ').length,
    heroTitle: cs('.hero-title').fontSize,
    heroMinH: cs('.hero').minHeight,
    headerH: cs('.site-header').height,
    navVisible: cs('.site-nav').visibility,
  };
});
check('mobile-4col-grid', mobile.gridCols === 4, `cols=${mobile.gridCols}`);
check('mobile-hero-title-40-52px', parseInt(mobile.heroTitle) >= 40 && parseInt(mobile.heroTitle) <= 52, mobile.heroTitle);
check('mobile-hero-min-680px', parseInt(mobile.heroMinH) >= 680, mobile.heroMinH);
check('mobile-header-60px', parseInt(mobile.headerH) === 60, mobile.headerH);
check('mobile-nav-hidden-collapsed', mobile.navVisible === 'hidden', mobile.navVisible);

await browser.close();
const fails = results.filter(r => !r.ok).length;
console.log(`\nTotal: ${results.length}, Failures: ${fails}`);
process.exit(fails ? 1 : 0);
