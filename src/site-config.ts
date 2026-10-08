/**
 * Site-wide constants.
 *
 * Static content lives in index.html for SEO; this module is the runtime
 * single source for values referenced by scripts. Keep `icp` in sync with
 * the footer markup in index.html.
 */
export const SITE_CONFIG = {
  siteName: '寒雅车载技术研习录',
  brandName: '寒微雅致 HWYZ',
  brandShort: 'HWYZ',
  brandSlogan: 'ADVANCED MOBILITY',
  seriesName: '寒川 HC',
  modelName: '寒川03 HanChuan03',
  // ICP filing number - MUST be displayed verbatim in the footer.
  icp: '沪ICP备2026047005号-1',
  copyrightYear: new Date().getFullYear(),
  // Contact form demo mode: no real data is sent or stored until the
  // receiving endpoint and privacy rules are confirmed.
  demoModeNotice: '演示模式：提交内容仅在本页面验证，不会发送或保存。',
  demoSubmitDelayMs: 800,
} as const;
