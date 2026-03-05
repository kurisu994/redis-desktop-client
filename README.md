# Redis Desktop Client

跨平台 Redis 桌面客户端，基于 Tauri 2 + Next.js 16 + HeroUI 构建。

## 技术栈

- **桌面框架**：Tauri 2.x
- **前端**：Next.js 16 (Turbopack) + React 19 + TypeScript
- **UI 组件库**：HeroUI (@heroui/react)
- **样式**：Tailwind CSS 4.x
- **状态管理**：Zustand 5.x
- **国际化**：i18next + react-i18next（中/英）
- **图标**：lucide-react
- **后端**：Rust (Edition 2021) + Tokio + redis-rs

## 开发环境准备

### 前置依赖

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) (MSRV 1.77.2)
- [just](https://github.com/casey/just)（命令运行器）
- Tauri 2 系统依赖（参考 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/)）

### 安装依赖

```bash
just install
```

### 启动开发

```bash
# 启动 Tauri 完整开发环境（前后端热重载）
just dev

# 仅启动 Next.js 前端（localhost:3000）
just dev-web
```

### 构建

```bash
# 生产构建（桌面应用）
just build

# 仅构建前端
just build-web
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `just dev` | 启动 Tauri 开发模式 |
| `just dev-web` | 仅启动前端 |
| `just build` | 生产构建 |
| `just lint` | 完整代码检查（ESLint + tsc + Clippy） |
| `just fmt` | 格式化全部代码 |
| `just test-rust` | Rust 单元测试 |
| `just i18n-check` | 检查翻译 key 完整性 |
| `just clean` | 清理构建产物 |

## 项目结构

```
src/                        # 前端源码
├── app/                    # Next.js App Router
├── components/             # React 组件
│   ├── providers.tsx       # 全局 Provider
│   └── layout/             # 布局组件（含 Tab 页签栏）
├── stores/                 # Zustand 状态仓库
└── i18n/                   # 国际化配置与翻译文件

src-tauri/                  # Rust 后端
├── src/
│   ├── lib.rs              # Tauri 入口
│   ├── commands/           # Tauri Command 处理器
│   ├── redis/              # Redis 客户端封装
│   └── config/             # 配置管理
└── tauri.conf.json         # Tauri 配置

docs/                       # 项目文档
├── REQUIREMENTS.md         # 产品需求文档
└── DEVELOPMENT_PLAN.md     # 开发计划
```

## License

MIT
