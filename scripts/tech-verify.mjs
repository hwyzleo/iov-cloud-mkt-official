import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('technology').scrollIntoView());
await page.waitForTimeout(1200);

const result = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.tech-item'));
  return items.map((item, i) => {
    const visual = item.querySelector('.tech-visual').getBoundingClientRect();
    const copy = item.querySelector('.tech-copy').getBoundingClientRect();
    return {
      i: i + 1,
      title: item.querySelector('h3').textContent,
      // vertical alignment: center offset between visual and copy
      centerDelta: Math.round((visual.top + visual.height / 2) - (copy.top + copy.height / 2)),
      // horizontal order: visual left of copy?
      visualLeft: visual.left, copyLeft: copy.left,
      svgCount: item.querySelectorAll('.tech-visual svg *').length,
      svgSize: { w: Math.round(visual.width), h: Math.round(visual.height) },
    };
  });
});
let fails = 0;
for (const r of result) {
  const aligned = Math.abs(r.centerDelta) < 12;
  const leftToRight = r.visualLeft < r.copyLeft;
  const rich = r.svgCount > 15;
  const ok = aligned && leftToRight && rich;
  console.log(`${ok ? 'PASS' : 'FAIL'}  item${r.i}-${r.title}  centerDelta=${r.centerDelta} visualLeft=${Math.round(r.visualLeft)} copyLeft=${Math.round(r.copyLeft)} svgEls=${r.svgCount}`);
  if (!ok) fails++;
}
await page.screenshot({ path: 'artifacts/tech-section.png', fullPage: false });
console.log(fails === 0 ? '\nTECH LAYOUT OK' : `\n${fails} FAILURES`);
await browser.close();
process.exit(fails ? 1 : 0);
