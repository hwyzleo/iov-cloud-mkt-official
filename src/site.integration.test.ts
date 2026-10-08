// @vitest-environment happy-dom
/**
 * Integration tests: load the real index.html into a DOM, boot main.ts,
 * and verify the interactive behaviours specified by CR-MKT-OFFICIAL-DSN-002
 * (车载技术研习与交流定位，非车型销售页).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

// Strip <script> tags: the app is booted explicitly via loadApp() and
// happy-dom cannot load ES modules from innerHTML.
function stripScripts(source: string): string {
  return source.replace(/<script[\s\S]*?<\/script>/g, '');
}

// IntersectionObserver is not implemented by happy-dom; stub it so the
// reveal / active-nav modules initialise without throwing.
class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

async function loadApp(): Promise<void> {
  await import('../src/main.ts');
}

async function mountApp(): Promise<void> {
  document.body.innerHTML = stripScripts(html);
  (globalThis as Record<string, unknown>).IntersectionObserver = IntersectionObserverStub;
  await loadApp();
}

describe('site structure (index.html, tech-lab positioning)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('contains the tech-lab section architecture', () => {
    for (const id of ['hero', 'lab', 'domains', 'architecture', 'notes', 'vehicle', 'exchange', 'footer']) {
      expect(document.getElementById(id), `missing section #${id}`).not.toBeNull();
    }
    expect(document.querySelector('.site-header')).not.toBeNull();
  });

  it('no longer contains sales-oriented sections (product stage / contact CTA)', () => {
    expect(document.getElementById('product')).toBeNull();
    expect(document.getElementById('contact')).toBeNull();
    expect(document.getElementById('contact-form')).toBeNull();
  });

  it('renders the five tech-lab anchor nav items and the CTA', () => {
    const links = Array.from(document.querySelectorAll('#site-nav a[data-nav]'));
    expect(links.map((l) => l.textContent)).toEqual(['技术方向', '技术文章', '项目实践', '技术交流', '关于']);
    const cta = document.querySelector('.header-cta');
    expect(cta?.getAttribute('href')).toBe('#exchange');
    expect(cta?.textContent).toBe('参与交流');
  });

  it('hero copy leads with tech-lab positioning and research topics', () => {
    const title = document.querySelector('.hero-title')?.textContent ?? '';
    expect(title).toContain('车载技术');
    const tags = Array.from(document.querySelectorAll('.hero-tags li')).map((li) => li.textContent);
    expect(tags).toEqual(['智能座舱', '车联网', 'EE 架构', '软件定义汽车']);
  });

  it('hero CTAs use non-sales wording (explore / exchange)', () => {
    const ctaHrefs = Array.from(document.querySelectorAll('.hero-actions a')).map((a) => a.getAttribute('href'));
    expect(ctaHrefs).toEqual(['#domains', '#exchange']);
    const ctaText = Array.from(document.querySelectorAll('.hero-actions a')).map((a) => a.textContent);
    expect(ctaText).toEqual(['探索技术方向', '参与技术交流']);
  });

  it('does not contain any sales wording across the page', () => {
    const bodyText = document.body.textContent ?? '';
    for (const banned of ['预约试驾', '立即拥有', '获取报价', '探索车型', '在线购车', '门店', '询价', '价格', '续航', '动力']) {
      expect(bodyText, `banned term: ${banned}`).not.toContain(banned);
    }
  });

  it('renders three technology domain cards with keywords and links', () => {
    const cards = Array.from(document.querySelectorAll('.domain-card'));
    expect(cards.length).toBe(3);
    expect(cards.map((c) => c.querySelector('h3')?.textContent)).toEqual(['智能座舱', '车联网', 'EE 架构']);
    for (const card of cards) {
      expect(card.querySelectorAll('.domain-keywords li').length).toBeGreaterThanOrEqual(3);
      expect(card.querySelector('.domain-link')?.textContent).toContain('查看研习内容');
    }
  });

  it('architecture canvas is labelled as a concept diagram with a legend', () => {
    const canvas = document.getElementById('architecture');
    expect(canvas).not.toBeNull();
    expect(canvas?.querySelector('.arch-badge')?.textContent).toContain('概念示意');
    expect(canvas?.querySelectorAll('.arch-legend li').length).toBeGreaterThanOrEqual(3);
    expect(canvas?.querySelector('.arch-svg text[class="arch-label"]')).not.toBeNull();
  });

  it('renders 3–6 study-note cards with category, summary and status', () => {
    const cards = Array.from(document.querySelectorAll('.note-card'));
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(cards.length).toBeLessThanOrEqual(6);
    for (const card of cards) {
      expect(card.querySelector('.note-cat')?.textContent?.trim()).not.toBe('');
      expect(card.querySelector('h3')?.textContent?.trim()).not.toBe('');
      expect(card.querySelector('.note-summary')?.textContent?.trim()).not.toBe('');
      expect(card.querySelector('.note-status')?.textContent).toContain('整理中');
    }
  });

  it('vehicle block is framed as a technical carrier, not a car showroom', () => {
    const title = document.querySelector('#vehicle .section-title')?.textContent ?? '';
    expect(title).toContain('技术载体');
    expect(document.querySelector('#vehicle .vehicle-points')).not.toBeNull();
    // no thumbnail carousel ("选车" experience removed)
    expect(document.querySelectorAll('#vehicle .product-thumb, #vehicle button[data-src]').length).toBe(0);
  });

  it('exchange form uses tech-topic fields and non-sales submit wording', () => {
    const form = document.getElementById('exchange-form');
    expect(form).not.toBeNull();
    const interest = document.getElementById('f-interest') as HTMLSelectElement;
    const options = Array.from(interest.options).map((o) => o.textContent);
    expect(options).toContain('智能座舱');
    expect(options).toContain('EE 架构');
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.textContent).toBe('发起技术交流');
  });

  it('shows the ICP filing number verbatim in the footer, linked to MIIT', () => {
    const icp = document.querySelector('.footer-icp')!;
    expect(icp.textContent.trim()).toBe('沪ICP备2026047005号-1');
    const link = icp.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://beian.miit.gov.cn/');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.textContent?.trim()).toBe('沪ICP备2026047005号-1');
  });

  it('footer states the non-sales positioning', () => {
    expect(document.querySelector('.footer-positioning')?.textContent).toContain('不提供车辆销售服务');
  });

  it('labels the form as demo mode (no real data)', () => {
    expect(document.getElementById('form-note')?.textContent).toContain('演示模式');
  });

  it('provides alt text on every vehicle image', () => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="vehicles"]'));
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    for (const img of imgs) {
      expect(img.alt.trim(), `missing alt on ${img.src}`).not.toBe('');
    }
  });

  it('page title and description lead with the tech-lab theme', () => {
    expect(html).toMatch(/<title>寒雅车载技术研习录｜智能座舱、车联网与 EE 架构<\/title>/);
    const descMatch = html.match(/<meta\n?\s*name="description"\n?\s*content="([^"]+)"/);
    expect(descMatch?.[1] ?? '').toContain('车载技术');
  });
});

describe('header scroll state', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  it('is transparent initially and frosted after scrolling', () => {
    const header = document.getElementById('site-header')!;
    expect(header.classList.contains('is-scrolled')).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 120, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(header.classList.contains('is-scrolled')).toBe(true);

    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(header.classList.contains('is-scrolled')).toBe(false);
  });
});

describe('mobile drawer menu', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
  });

  it('opens and closes via the toggle button', () => {
    const toggle = document.getElementById('menu-toggle') as HTMLButtonElement;
    const nav = document.getElementById('site-nav')!;

    expect(nav.classList.contains('is-open')).toBe(false);
    toggle.click();
    expect(nav.classList.contains('is-open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(nav.classList.contains('is-open')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape', () => {
    const toggle = document.getElementById('menu-toggle') as HTMLButtonElement;
    const nav = document.getElementById('site-nav')!;
    toggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(nav.classList.contains('is-open')).toBe(false);
  });

  it('closes when a nav link is clicked', () => {
    const toggle = document.getElementById('menu-toggle') as HTMLButtonElement;
    const nav = document.getElementById('site-nav')!;
    toggle.click();
    const link = nav.querySelector<HTMLAnchorElement>('a[href="#domains"]')!;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(nav.classList.contains('is-open')).toBe(false);
  });
});

describe('tech exchange form (demo mode)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows inline errors when required fields are empty', () => {
    const form = document.getElementById('exchange-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(document.getElementById('f-name-error')!.textContent).toBe('请填写称呼');
    expect(document.getElementById('f-contact-error')!.textContent).toBe('请填写联系方式');
    expect(document.getElementById('f-interest-error')!.textContent).toBe('请选择关注方向');
    expect(document.getElementById('f-note-error')!.textContent).toBe('');
    expect(document.getElementById('form-status')!.textContent).toContain('请检查');
  });

  it('reports success in demo mode for a valid submission without sending data', () => {
    vi.useFakeTimers();
    const form = document.getElementById('exchange-form') as HTMLFormElement;
    (document.getElementById('f-name') as HTMLInputElement).value = '王小雅';
    (document.getElementById('f-contact') as HTMLInputElement).value = 'wang@example.com';
    (document.getElementById('f-interest') as HTMLSelectElement).value = '智能座舱';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const status = document.getElementById('form-status')!;
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitBtn.disabled).toBe(true);
    expect(status.classList.contains('is-success')).toBe(false);

    vi.advanceTimersByTime(800);
    expect(submitBtn.disabled).toBe(false);
    expect(status.classList.contains('is-success')).toBe(true);
    expect(status.textContent).toContain('演示模式，未发送真实数据');
  });

  it('clears a field error while typing', () => {
    const form = document.getElementById('exchange-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(document.getElementById('f-name-error')!.textContent).toBe('请填写称呼');

    const name = document.getElementById('f-name') as HTMLInputElement;
    name.value = '王小雅';
    name.dispatchEvent(new Event('input'));
    expect(document.getElementById('f-name-error')!.textContent).toBe('');
  });
});
