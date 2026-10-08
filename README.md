# iov-cloud-mkt-officail

「寒雅车载技术研习录」汽车品牌官网 MVP —— 寒微雅致 HWYZ / 寒川 HC / 寒川03 HanChuan03。

> 设计来源：CR-MKT-OFFICIAL-DSN-001（SPEC 设计 v0.1，2026-10-08 生效）
> 需求来源：CR-MKT-OFFICIAL-REQ-001

## 技术栈

- [Vite](https://vitejs.dev/) + 原生 TypeScript 静态站点（无框架）
- 原生 CSS + CSS 变量设计令牌（颜色 / 间距 / 圆角 / 阴影 / 动效时长）
- [Vitest](https://vitest.dev/) + happy-dom（单元 / 集成测试）
- Playwright-core + 系统 Chrome（真实浏览器端到端验证）

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 本地开发 http://localhost:5173
npm test           # 单元 + 集成测试（32 项）
npm run build      # 类型检查 + 静态构建到 dist/
npm run preview    # 本地预览构建产物
```

### 端到端验证（可选）

```bash
npm run preview    # 先启动预览服务 http://localhost:4173
node scripts/e2e-verify.mjs      # 三档视口 / 交互 / 表单 / SEO（16 项）
node scripts/style-verify.mjs    # 设计令牌与断点计算样式（14 项）
```

## 页面结构（8 分区）

Header → Hero → BrandStatement → CapabilityGrid → ProductStage → TechnologyStory → ContactCTA → Footer

## 设计令牌

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--color-bg-primary` | `#080A0D` | 页面主背景 |
| `--color-bg-secondary` | `#141820` | 卡片 / 分区背景 |
| `--color-text-primary` | `#F4F7FA` | 主文字 |
| `--color-text-secondary` | `#A8B0BE` | 辅助文字 |
| `--color-accent-cyan` | `#65F4D5` | 主 CTA / 关键状态 |
| `--color-accent-blue` | `#5B8CFF` | 辅助渐变 / 技术光效 |
| `--color-border` | `rgba(255,255,255,0.12)` | 分隔线 / 边框 |

响应式断点：`≥1200px` 12 列 / `768–1199px` 8 列 / `<768px` 4 列；内容最大宽度 1280px。

## 资产说明（重要）

页面当前引用**AI 生成的四视角车辆图**（深色背景，与页面背景 `#080A0D` 天然融合，无需抠图）与**已抠图的透明版 Logo**：

```
public/assets/
├── brand/
│   ├── HWYZ.png                     # 原始素材（棋盘格背景，不展示，保留作源）
│   ├── hwyz-lockup.png              # 原色透明组合标（归档）
│   ├── hwyz-lockup-white.png        # 冷白组合标（深色背景用，页面引用）
│   └── hwyz-mark-white.png          # 冷白翼形徽标（Header 引用）
└── vehicles/
    └── hanchuan03/
        ├── Vehicle.png              # 原始素材（棋盘格背景，不展示，保留作源）
        ├── hero-front-3q.{jpeg,webp}       # 前侧45°（Hero/ProductStage 主图）
        └── exterior-{front,side,rear}.{jpeg,webp}  # 正面/侧面/尾部（视角切换）
```

- **车辆图**：AI 生成，深色背景自带冷色轮廓光；页面通过 `<picture>` 优先加载 WebP（hero 50KB / 视角图 ~20KB），JPEG 作回退；CSS 径向 mask 羽化图片边缘使其融入深色背景。
- **Logo 处理管线**：`scripts/cutout.py`（棋盘格去除 + 羽化）→ `scripts/process_assets.py`（白化 + 裁剪翼形 mark）。重新接入 Logo 素材时复跑：`python3 scripts/cutout.py <src.png> <out.png> && python3 scripts/process_assets.py`。
- 设计红线已满足：原始棋盘格素材不再被页面引用。

## 合规与数据

- 页脚备案号常量：`沪ICP备2026047005号-1`（与 `src/site-config.ts` 中 `icp` 同步）。
- 表单为**演示模式**：仅前端校验与模拟成功反馈，不发送、不保存真实数据；真实接收接口与隐私规则确认前不得上线收集个人信息。
