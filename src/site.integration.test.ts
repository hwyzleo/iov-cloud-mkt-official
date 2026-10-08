// @vitest-environment happy-dom
/**
 * Integration tests: load the real index.html into a DOM, boot main.ts,
 * and verify the interactive behaviours specified by CR-MKT-OFFICIAL-DSN-001.
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

describe('site structure (index.html)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('contains all eight sections of the MVP', () => {
    for (const id of ['hero', 'brand', 'capability', 'product', 'technology', 'contact', 'footer']) {
      expect(document.getElementById(id), `missing section #${id}`).not.toBeNull();
    }
    expect(document.querySelector('.site-header')).not.toBeNull();
  });

  it('renders the four anchor nav items and the CTA', () => {
    const links = Array.from(document.querySelectorAll('#site-nav a[data-nav]'));
    expect(links.map((l) => l.textContent)).toEqual(['品牌', '技术', '车型', '关于']);
    expect(document.querySelector('.header-cta')?.getAttribute('href')).toBe('#contact');
  });

  it('shows the ICP filing number verbatim in the footer', () => {
    expect(document.querySelector('.footer-icp')?.textContent).toBe('沪ICP备2026047005号-1');
  });

  it('renders all four contact form fields', () => {
    for (const id of ['f-name', 'f-contact', 'f-interest', 'f-note']) {
      expect(document.getElementById(id), `missing field #${id}`).not.toBeNull();
    }
  });

  it('labels the form as demo mode (no real data)', () => {
    expect(document.getElementById('form-note')?.textContent).toContain('演示模式');
  });

  it('provides an alt text on every vehicle image', () => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="vehicles"]'));
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    for (const img of imgs) {
      expect(img.alt.trim(), `missing alt on ${img.src}`).not.toBe('');
    }
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
    const link = nav.querySelector<HTMLAnchorElement>('a[href="#brand"]')!;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(nav.classList.contains('is-open')).toBe(false);
  });
});

describe('product stage view switching', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
  });

  it('switches the main image when a thumbnail is selected', () => {
    const img = document.getElementById('product-main-image') as HTMLImageElement;
    const side = document.querySelector<HTMLButtonElement>('button[data-src*="exterior-side"]')!;

    side.click();
    expect(img.src).toContain('exterior-side');
    expect(side.getAttribute('aria-pressed')).toBe('true');

    const front = document.querySelector<HTMLButtonElement>('button[data-src*="hero-front-3q"]')!;
    expect(front.getAttribute('aria-pressed')).toBe('false');
    front.click();
    expect(img.src).toContain('hero-front-3q');
    expect(front.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the <picture> <source> srcset in sync so the browser renders the new view', () => {
    const img = document.getElementById('product-main-image') as HTMLImageElement;
    const source = img.closest('picture')?.querySelector('source');
    expect(source, 'product-main should be inside a <picture>').not.toBeNull();
    expect((source as HTMLSourceElement).getAttribute('srcset')).toContain('hero-front-3q');

    const rear = document.querySelector<HTMLButtonElement>('button[data-src*="exterior-rear"]')!;
    rear.click();
    expect(img.src).toContain('exterior-rear');
    expect((source as HTMLSourceElement).getAttribute('srcset')).toContain('exterior-rear');
  });
});

describe('contact form (demo mode)', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mountApp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows inline errors when required fields are empty', () => {
    const form = document.getElementById('contact-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(document.getElementById('f-name-error')!.textContent).toBe('请填写称呼');
    expect(document.getElementById('f-contact-error')!.textContent).toBe('请填写联系方式');
    expect(document.getElementById('f-interest-error')!.textContent).toBe('请选择关注方向');
    expect(document.getElementById('f-note-error')!.textContent).toBe('');
    expect(document.getElementById('form-status')!.textContent).toContain('请检查');
  });

  it('reports success in demo mode for a valid submission without sending data', () => {
    vi.useFakeTimers();
    const form = document.getElementById('contact-form') as HTMLFormElement;
    (document.getElementById('f-name') as HTMLInputElement).value = '王小雅';
    (document.getElementById('f-contact') as HTMLInputElement).value = 'wang@example.com';
    (document.getElementById('f-interest') as HTMLSelectElement).value = '产品咨询';

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
    const form = document.getElementById('contact-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(document.getElementById('f-name-error')!.textContent).toBe('请填写称呼');

    const name = document.getElementById('f-name') as HTMLInputElement;
    name.value = '王小雅';
    name.dispatchEvent(new Event('input'));
    expect(document.getElementById('f-name-error')!.textContent).toBe('');
  });
});
