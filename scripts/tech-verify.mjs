/**
 * Real-browser verification (Playwright + system Chrome).
 * Verifies the technology content sections for CR-MKT-OFFICIAL-DSN-002:
 * NotesAndPractice card grid + ArchitectureCanvas readability.
 */
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('notes').scrollIntoView());
await page.waitForTimeout(1200);

const notes = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.note-card'));
  const gridCols = getComputedStyle(document.querySelector('.notes-grid')).gridTemplateColumns.split(' ').length;
  return {
    gridCols,
    cards: cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        title: card.querySelector('h3').textContent,
        cat: card.querySelector('.note-cat').textContent,
        summary: (card.querySelector('.note-summary').textContent || '').length,
        link: card.querySelector('.note-link')?.getAttribute('href') ?? '',
        left: Math.round(rect.left),
        width: Math.round(rect.width),
      };
    }),
  };
});
let fails = 0;
const ok = (cond, name, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!cond) fails++; };

ok(notes.gridCols === 12, 'notes-desktop-12col-grid', `cols=${notes.gridCols}`);
ok(notes.cards.length >= 3 && notes.cards.length <= 6, 'notes-3-to-6-cards', `cards=${notes.cards.length}`);
ok(notes.cards.every((c) => c.cat && c.summary > 10 && c.link), 'notes-card-complete', JSON.stringify(notes.cards.map((c) => c.title)));
const colLefts = [...new Set(notes.cards.map((c) => c.left))].length;
ok(colLefts >= 2 && colLefts <= 3, 'notes-three-column-layout', `columns=${colLefts}`);
await page.screenshot({ path: 'artifacts/tech-section.png', fullPage: false });

// ArchitectureCanvas: labels readable (>= 14px rendered), legend + concept badge
await page.evaluate(() => document.getElementById('architecture').scrollIntoView());
await page.waitForTimeout(1200);
const arch = await page.evaluate(() => {
  const labels = Array.from(document.querySelectorAll('.arch-label'));
  const viewport = document.querySelector('.arch-viewport').getBoundingClientRect();
  // Every connector must start AND end on a node edge (no floating/missing links).
  const nodes = Array.from(document.querySelectorAll('.arch-node')).map((r) => {
    const b = r.getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const onEdge = (p) => nodes.some((n) =>
    (Math.abs(p.x - n.x) < 2 && p.y >= n.y - 2 && p.y <= n.y + n.h + 2) ||
    (Math.abs(p.x - (n.x + n.w)) < 2 && p.y >= n.y - 2 && p.y <= n.y + n.h + 2) ||
    (Math.abs(p.y - n.y) < 2 && p.x >= n.x - 2 && p.x <= n.x + n.w + 2) ||
    (Math.abs(p.y - (n.y + n.h)) < 2 && p.x >= n.x - 2 && p.x <= n.x + n.w + 2));
  const lines = Array.from(document.querySelectorAll('.arch-line')).map((l) => {
    const len = l.getTotalLength();
    const a = l.getPointAtLength(0);
    const b = l.getPointAtLength(len);
    return { start: onEdge(a), end: onEdge(b), key: l.getAttribute('class') };
  });
  return {
    labelMin: Math.min(...labels.map((el) => parseFloat(getComputedStyle(el).fontSize))),
    svgEls: document.querySelectorAll('.arch-svg *').length,
    legend: document.querySelectorAll('.arch-legend li').length,
    badge: document.querySelector('.arch-badge').textContent,
    viewportScrollable: document.querySelector('.arch-viewport').scrollWidth > viewport.width,
    lineCount: lines.length,
    lines: lines.map((l) => `${l.key}:${l.start}/${l.end}`),
    allConnected: lines.every((l) => l.start && l.end),
  };
});
ok(arch.labelMin >= 14, 'arch-label-min-14px', `min=${arch.labelMin}px`);
ok(arch.svgEls > 20, 'arch-svg-rich', `els=${arch.svgEls}`);
ok(arch.legend >= 3, 'arch-legend-present', `items=${arch.legend}`);
ok(arch.badge.includes('概念示意'), 'arch-concept-badge', arch.badge);
ok(!arch.viewportScrollable, 'arch-fits-container-desktop', `scrollW=${arch.viewportScrollable}`);
ok(arch.allConnected, 'arch-all-lines-connect-to-nodes', arch.lines.join(' '));

// Mobile: architecture stays readable via internal scroll; page has no overflow
await page.setViewportSize({ width: 375, height: 812 });
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('architecture').scrollIntoView());
await page.waitForTimeout(800);
const mobile = await page.evaluate(() => {
  const vp = document.querySelector('.arch-viewport');
  const labels = Array.from(document.querySelectorAll('.arch-label'));
  return {
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    archScrollable: vp ? vp.scrollWidth > vp.clientWidth : false,
    labelMin: Math.min(...labels.map((el) => parseFloat(getComputedStyle(el).fontSize))),
    hint: getComputedStyle(document.querySelector('.arch-scroll-hint')).display,
  };
});
ok(mobile.pageOverflow <= 0, 'mobile-page-no-horizontal-overflow', `overflow=${mobile.pageOverflow}px`);
ok(mobile.archScrollable, 'mobile-arch-internal-scroll', `scrollW=${mobile.archScrollable}`);
ok(mobile.labelMin >= 14, 'mobile-arch-label-min-14px', `min=${mobile.labelMin}px`);
ok(mobile.hint !== 'none', 'mobile-arch-scroll-hint-visible', `display=${mobile.hint}`);

console.log(fails === 0 ? '\nTECH CONTENT OK' : `\n${fails} FAILURES`);
await browser.close();
process.exit(fails ? 1 : 0);
