# iov-cloud-mkt-officail

「寒雅车载技术研习录」—— 车载技术研习、介绍与交流站。寒微雅致 HWYZ / 寒川 HC / 寒川03 HanChuan03 作为技术载体与概念案例素材出现，页面不提供车辆销售服务。

> 设计来源：CR-MKT-OFFICIAL-DSN-002（SPEC 设计 v0.2，2026-10-08 生效）
> 需求来源：CR-MKT-OFFICIAL-REQ-002

## 技术栈

- [Vite](https://vitejs.dev/) + 原生 TypeScript 静态站点（无框架）
- 原生 CSS + CSS 变量设计令牌（颜色 / 间距 / 圆角 / 阴影 / 动效时长）
- [Vitest](https://vitest.dev/) + happy-dom（单元 / 集成测试）
- Playwright-core + 系统 Chrome（真实浏览器端到端验证）

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 本地开发 http://localhost:5173
npm test           # 单元 + 集成测试（40 项）
npm run build      # 类型检查 + 静态构建到 dist/
npm run preview    # 本地预览构建产物
```

### 端到端验证（可选）

```bash
npm run preview    # 先启动预览服务 http://localhost:4173
node scripts/e2e-verify.mjs      # 三档视口 / 交互 / 表单 / SEO / 非销售校验（20 项）
node scripts/style-verify.mjs    # 设计令牌与断点计算样式（14 项）
node scripts/tech-verify.mjs     # 技术文章卡网格与架构图可读性
node scripts/asset-verify.mjs    # 车辆 / Logo 素材与无陈旧车型轮播
```

## 页面结构（9 分区）

Header → Hero → LabStatement → TechnologyDomains → ArchitectureCanvas → NotesAndPractice → VehicleAsPlatform → TechExchange → Footer

- **Hero**：研习录定位、主题标签（智能座舱 / 车联网 / EE 架构 / 软件定义汽车）、CTA「探索技术方向 / 参与技术交流」，车辆与技术图层组合视觉。
- **LabStatement**：关注领域、内容形态、交流目的与非销售声明。
- **TechnologyDomains**：智能座舱、车联网、EE 架构三张技术域卡（关键词 + 研习内容入口）。
- **ArchitectureCanvas**：整车到云端分层概念示意图（座舱/车辆 → 车载网络与 TBOX → 云端服务 → 用户与生态），含图例与「概念示意」标注；移动端组件内横向滚动。
- **NotesAndPractice**：5 张技术文章/研习笔记卡（分类标签 + 摘要 + 「整理中」状态）。
- **VehicleAsPlatform**：寒川03 作为技术载体 / 概念案例，单张主图，不展示销售参数。
- **TechExchange**：公开邮箱 / 代码仓库入口 + 演示模式留言表单（称呼、联系方式、技术方向、交流内容）。

## 设计令牌

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--color-bg-primary` | `#080A0D` | 页面主背景 |
| `--color-bg-secondary` | `#141820` | 卡片 / 分区背景 |
| `--color-text-primary` | `#F4F7FA` | 主文字 |
| `--color-text-secondary` | `#A8B0BE` | 辅助文字 |
| `--color-accent-cyan` | `#65F4D5` | 主 CTA / 关键路径 |
| `--color-accent-blue` | `#5B8CFF` | 辅助链路 / 技术光效 |
| `--color-accent-purple` | `#8D7CFF` | 内容分类低饱和辅助色 |
| `--color-border` | `rgba(255,255,255,0.12)` | 分隔线 / 边框 |

响应式断点：`≥1200px` 12 列 / `768–1199px` 8 列 / `<768px` 4 列；内容最大宽度 1280px。

## 资产说明（重要）

页面引用**已抠图的透明版 Logo** 与 **AI 生成的四视角车辆图**（深色背景，与页面背景 `#080A0D` 融合，CSS 径向 mask 羽化边缘）：

```
public/assets/
├── brand/
│   ├── HWYZ.png                     # 原始素材（棋盘格背景，不展示，保留作源）
│   ├── hwyz-lockup.png              # 原色透明组合标（归档）
│   ├── hwyz-lockup-white.png        # 冷白组合标（深色背景用，保留作备选）
│   └── hwyz-mark-white.png          # 冷白翼形徽标（Header / Footer 引用）
└── vehicles/
    └── hanchuan03/
        ├── Vehicle.png              # 原始素材（棋盘格背景，不展示，保留作源）
        ├── hero-front-3q.{jpeg,webp}       # 前侧45°（Hero / 技术载体主图）
        └── exterior-{front,side,rear}.{jpeg,webp}  # 正面/侧面/尾部（保留，未在页面使用）
```

- **Logo 处理管线**：`scripts/cutout.py`（棋盘格去除 + 羽化）→ `scripts/process_assets.py`（白化 + 裁剪翼形 mark）。重新接入 Logo 素材时复跑：`python3 scripts/cutout.py <src.png> <out.png> && python3 scripts/process_assets.py`。
- 设计红线已满足：原始棋盘格素材不再被页面引用；页面不再出现车型缩略图轮播（CR-MKT-OFFICIAL-DSN-002 移除「选车」体验）。

## 合规与数据

- 页脚定位声明：「本站用于车载技术研习、介绍与交流，不提供车辆销售服务。」
- 页脚备案号常量：`沪ICP备2026047005号-1`（与 `src/site-config.ts` 中 `icp` 同步）。
- 表单为**演示模式**：仅前端校验与模拟成功反馈，不发送、不保存真实数据；真实接收接口与隐私规则确认前不得上线收集个人信息。
