import './styles/main.css';

import { SITE_CONFIG } from './site-config';
import { initHeaderScroll } from './lib/header';
import { initMobileMenu } from './lib/mobile-menu';
import { initActiveNav } from './lib/active-nav';
import { initReveal } from './lib/reveal';
import { initProductStage } from './lib/product-stage';
import { initContactForm } from './lib/contact-form';

function init(): void {
  const header = document.getElementById('site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  const productStage = document.getElementById('product-stage');
  const form = document.getElementById('contact-form');
  const yearEl = document.getElementById('copyright-year');

  if (header) initHeaderScroll(header);
  if (menuToggle instanceof HTMLButtonElement && nav) initMobileMenu(menuToggle, nav);
  if (nav) initActiveNav(nav);
  initReveal();
  if (productStage) initProductStage(productStage);
  if (form instanceof HTMLFormElement) initContactForm(form);
  if (yearEl) yearEl.textContent = String(SITE_CONFIG.copyrightYear);
}

init();
