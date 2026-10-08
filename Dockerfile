# 构建阶段：Node 22 LTS
# 版本下限由依赖的 engines 决定（见 package-lock.json）：
#   vite 8.3.3 / rolldown 1.2.13 -> ^20.19.0 || >=22.12.0
#   vitest 5.0.3                 -> ^22.12.0 || ^24.0.0 || >=26.0.0
# 取 22.x 可同时满足构建与测试，且与开发环境一致。
FROM node:22.23.1-alpine AS builder

WORKDIR /app

ARG NODE_OPTIONS=--max-old-space-size=4096

ENV NODE_OPTIONS=${NODE_OPTIONS}
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json ./

# 构建需要 vite 与 tsc，故保留 devDependencies。
RUN npm ci --include=dev

COPY . .

# 测试门禁：vitest 单元 + happy-dom 集成测试（约 0.5s）。
# 放在构建前，使「镜像构建成功」等价于「测试通过」。
# 注意：scripts/ 下的 e2e-verify / style-verify 依赖真实浏览器，不在此执行。
RUN npm test

RUN npm run build && test -f /app/dist/index.html

# 运行阶段：nginx 提供静态文件
FROM nginx:1.27.5-alpine AS runtime

COPY ui-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html/

RUN nginx -t

EXPOSE 80

# 探测轻量的 /health（见 ui-nginx.conf），避免每 10s 拉取完整首页 HTML。
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
