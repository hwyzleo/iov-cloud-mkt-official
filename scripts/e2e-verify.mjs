/**
 * Real-browser verification (Playwright + system Chrome).
 * Checks: 3 viewports have no horizontal overflow, anchors work,
 * drawer menu works, tech-lab structure, exchange form validation.
 * Updated for CR-MKT-OFFICIAL-DSN-002 (车载技术研习与交流定位).
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

  // ---- 3. Anchor navigation to the technology domains section ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const anchorTarget = await page.evaluate(async () => {
    document.querySelector('a[href="#domains"]')?.click();
    await new Promise((r) => setTimeout(r, 2000));
    const domains = document.getElementById('domains');
    return { inView: domains ? domains.getBoundingClientRect().top : null, top: domains?.offsetTop ?? -1 };
  });
  check('anchor-navigates-to-domains', anchorTarget.inView !== null && anchorTarget.inView < 400,
    `top=${anchorTarget.top} viewportTop=${anchorTarget.inView}`);

  // ---- 4. Hero CTAs (non-sales) ----
  const ctaHrefs = await page.$$eval('.hero-actions a', (els) => els.map((e) => e.getAttribute('href')));
  check('hero-cta-pair', JSON.stringify(ctaHrefs) === JSON.stringify(['#domains', '#exchange']),
    JSON.stringify(ctaHrefs));

  // ---- 5. Tech-lab first screen: title + three domain tags ----
  const heroState = await page.evaluate(() => ({
    title: document.querySelector('.hero-title')?.textContent ?? '',
    tags: Array.from(document.querySelectorAll('.hero-tags li')).map((li) => li.textContent),
    domainCount: document.querySelectorAll('.domain-card').length,
  }));
  check('hero-title-tech-lab', heroState.title.includes('车载技术'), heroState.title);
  check('hero-three-theme-tags', JSON.stringify(heroState.tags) === JSON.stringify(['智能座舱', '车联网', 'EE 架构', '软件定义汽车']),
    JSON.stringify(heroState.tags));
  check('three-domain-cards', heroState.domainCount === 3, `cards=${heroState.domainCount}`);

  // ---- 6. Mobile drawer menu ----
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('#menu-toggle');
  const menuOpen = await page.evaluate(() => document.getElementById('site-nav')?.classList.contains('is-open'));
  check('mobile-menu-opens', menuOpen === true);
  await page.keyboard.press('Escape');
  const menuClosed = await page.evaluate(() => document.getElementById('site-nav')?.classList.contains('is-open'));
  check('mobile-menu-closes-on-escape', menuClosed === false);

  // ---- 7. Vehicle block: technical carrier, no thumbnail carousel ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const vehicleState = await page.evaluate(() => ({
    title: document.querySelector('#vehicle .section-title')?.textContent ?? '',
    thumbs: document.querySelectorAll('#vehicle .product-thumb, #vehicle button[data-src]').length,
    mainImg: document.querySelector('#vehicle .vehicle-main img')?.getAttribute('src') ?? '',
  }));
  check('vehicle-titled-technical-carrier', vehicleState.title.includes('技术载体'), vehicleState.title);
  check('vehicle-no-thumbnail-carousel', vehicleState.thumbs === 0, `thumbs=${vehicleState.thumbs}`);
  check('vehicle-single-main-image', vehicleState.mainImg.includes('hero-front-3q'), vehicleState.mainImg);

  // ---- 8. Architecture canvas: concept badge + legend + rich svg ----
  const archState = await page.evaluate(() => ({
    badge: document.querySelector('.arch-badge')?.textContent ?? '',
    legend: document.querySelectorAll('.arch-legend li').length,
    svgEls: document.querySelectorAll('.arch-svg *').length,
    minLabel: Math.min(
      ...Array.from(document.querySelectorAll('.arch-label')).map((el) => parseFloat(getComputedStyle(el).fontSize)),
    ),
  }));
  check('arch-concept-badge', archState.badge.includes('概念示意'), archState.badge);
  check('arch-legend-present', archState.legend >= 3, `items=${archState.legend}`);
  check('arch-svg-rich', archState.svgEls > 20, `els=${archState.svgEls}`);
  check('arch-label-min-14px', archState.minLabel >= 14, `min=${archState.minLabel}px`);

  // ---- 9. Notes cards ----
  const notesState = await page.evaluate(() => Array.from(document.querySelectorAll('.note-card')).map((c) => ({
    cat: c.querySelector('.note-cat')?.textContent ?? '',
    status: c.querySelector('.note-status')?.textContent ?? '',
  })));
  check('notes-3-to-6-cards', notesState.length >= 3 && notesState.length <= 6, `cards=${notesState.length}`);
  check('notes-all-pending-status', notesState.every((n) => n.status.includes('整理中')));

  // ---- 10. Exchange form: empty submit shows errors ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('#exchange-form button[type="submit"]');
  const nameErr = await page.textContent('#f-name-error');
  check('form-required-error', (nameErr ?? '').includes('称呼'), nameErr ?? '');

  // ---- 11. Exchange form: valid submit succeeds in demo mode ----
  await page.fill('#f-name', '王小雅');
  await page.fill('#f-contact', 'wang@example.com');
  await page.selectOption('#f-interest', '智能座舱');
  await page.click('#exchange-form button[type="submit"]');
  await page.waitForSelector('#form-status.is-success', { timeout: 3000 });
  const statusText = await page.textContent('#form-status');
  check('form-demo-success', (statusText ?? '').includes('提交成功'), statusText ?? '');

  // ---- 12. Footer: positioning statement + ICP ----
  const footerState = await page.evaluate(() => {
    const icpLink = document.querySelector('.footer-icp a');
    return {
      positioning: document.querySelector('.footer-positioning')?.textContent ?? '',
      icp: document.querySelector('.footer-icp')?.textContent ?? '',
      icpHref: icpLink?.getAttribute('href') ?? '',
    };
  });
  check('footer-non-sales-statement', footerState.positioning.includes('不提供车辆销售服务'), footerState.positioning);
  check('footer-icp-verbatim', footerState.icp.trim() === '沪ICP备2026047005号-1', footerState.icp);
  check('footer-icp-linked-to-miit', footerState.icpHref === 'https://beian.miit.gov.cn/', footerState.icpHref);

  // ---- 13. No sales wording anywhere ----
  const bodyText = await page.evaluate(() => document.body.textContent ?? '');
  const banned = ['预约试驾', '立即拥有', '获取报价', '探索车型', '在线购车', '门店', '询价', '价格', '续航'];
  check('no-sales-wording', banned.every((w) => !bodyText.includes(w)),
    banned.filter((w) => bodyText.includes(w)).join(','));

  // ---- 14. prefers-reduced-motion: hero visible without animation ----
  const reducedPage = await browser.newPage({ reducedMotion: 'reduce' });
  await reducedPage.setViewportSize({ width: 1280, height: 800 });
  await reducedPage.goto(BASE, { waitUntil: 'networkidle' });
  const heroOpacity = await reducedPage.evaluate(() => {
    const title = document.querySelector('.hero-title');
    return title ? getComputedStyle(title).opacity : null;
  });
  check('reduced-motion-hero-visible', heroOpacity === '1', `opacity=${heroOpacity}`);

  // ---- 15. SEO head ----
  const seo = await reducedPage.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    og: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
  }));
  check('seo-title-tech-lab', /寒雅车载技术研习录/.test(seo.title) && /智能座舱/.test(seo.title) && /EE 架构/.test(seo.title), seo.title);
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
