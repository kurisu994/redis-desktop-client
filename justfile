# Redis Desktop Client — 项目命令入口
# 使用 `just <command>` 运行

set dotenv-load

# 默认命令：显示帮助
default:
    @just --list

# === 开发 ===

# 启动 Tauri 开发模式（前端 + 后端热重载）
dev:
    pnpm tauri dev

# 仅启动 Next.js 前端开发服务器
dev-web:
    pnpm dev

# === 构建 ===

# 构建生产版本（Tauri 桌面应用）
build:
    pnpm tauri build

# 仅构建 Next.js 前端
build-web:
    pnpm build

# 构建 Debug 版本（含调试符号）
build-debug:
    pnpm tauri build --debug

# === 代码检查 ===

# 运行全部代码检查（前端 + 后端）
lint: lint-web lint-rust

# ESLint + TypeScript 类型检查
lint-web:
    pnpm lint
    pnpm exec tsc --noEmit

# cargo clippy
lint-rust:
    cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings

# 格式化全部代码（prettier + cargo fmt）
fmt: fmt-web fmt-rust

# prettier 格式化前端代码
fmt-web:
    pnpm exec prettier --write "src/**/*.{ts,tsx,css,json}"

# cargo fmt 格式化 Rust 代码
fmt-rust:
    cd src-tauri && cargo fmt --all

# === 测试 ===

# 运行全部测试（前端 + 后端）
test: test-rust

# cargo test
test-rust:
    cd src-tauri && cargo test --all-features

# === 依赖管理 ===

# 安装全部依赖（pnpm install + cargo fetch）
install:
    pnpm install
    cd src-tauri && cargo fetch

# 清理构建产物
clean:
    rm -rf out .next
    cd src-tauri && cargo clean

# === 版本 & 发布 ===

# 同步更新所有配置文件的版本号
[no-exit-message]
version bump:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{bump}}" ]; then
        echo "Usage: just version <new_version>"
        echo "Example: just version 0.2.0"
        exit 1
    fi
    VERSION="{{bump}}"
    echo "Updating version to $VERSION..."
    # package.json
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json && rm package.json.bak
    # Cargo.toml
    sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak
    # tauri.conf.json
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json && rm src-tauri/tauri.conf.json.bak
    echo "✅ Version updated to $VERSION"

# 打包发布全流程（包含更新版本号、提交 Commit、推主干、打 Tag 并出包）
[no-exit-message]
release tag:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{tag}}" ]; then
        echo "Usage: just release <tag>"
        echo "Example: just release v0.2.0"
        exit 1
    fi
    
    TAG="{{tag}}"
    # 剥离前缀'v'用于修改内部配置的版本号
    VERSION="${TAG#v}"
    
    echo "🚀 开始基于版本 $TAG 构建发布流程..."
    
    echo "1️⃣ 更新配置文件的版本号 ($VERSION) ..."
    just version "$VERSION"
    
    echo "2️⃣ 自动更新 CHANGELOG.md..."
    if grep -q '## \[Unreleased\]' CHANGELOG.md; then
        TODAY=$(date +%Y-%m-%d)
        perl -i -pe "s/## \\[Unreleased\\]/## \\[Unreleased\\]\\n\\n---\\n\\n## [$VERSION] — $TODAY/" CHANGELOG.md
        echo "   ✅ CHANGELOG 已更新: [Unreleased] -> [$VERSION] — $TODAY"
    fi
    
    echo "3️⃣ 提交本次发布变更到 Git..."
    git add .
    git commit -m "🔖 release: $TAG" || echo "⚠️ 暂无变更需要提交，跳过 Commit"
    
    echo "4️⃣ 推送最新代码到当前远程分支..."
    git push origin HEAD
    
    echo "5️⃣ 创建并上传 $TAG 标签，准备触发云端构建流水线..."
    if git rev-parse "$TAG" >/dev/null 2>&1; then
        echo "⚠️ $TAG 标签已存在，将被跳过"
    else
        git tag -a "$TAG" -m "Release $TAG"
        git push origin "$TAG"
    fi
    
    echo "✅ 发布流程顺利结束！你可以去 GitHub Actions 查看最新的打包状态了。"

# === 工具 ===

# 检查翻译文件完整性（对比 en-US 和 zh-CN 的 key）
i18n-check:
    #!/usr/bin/env bash
    set -euo pipefail
    EN_KEYS=$(cat src/i18n/locales/en-US.json | python3 -c "import sys,json; d=json.load(sys.stdin); keys=set(); [keys.update([f'{k}.{sk}' for sk in v]) for k,v in d.items()]; print('\n'.join(sorted(keys)))")
    ZH_KEYS=$(cat src/i18n/locales/zh-CN.json | python3 -c "import sys,json; d=json.load(sys.stdin); keys=set(); [keys.update([f'{k}.{sk}' for sk in v]) for k,v in d.items()]; print('\n'.join(sorted(keys)))")
    MISSING_IN_ZH=$(comm -23 <(echo "$EN_KEYS") <(echo "$ZH_KEYS"))
    MISSING_IN_EN=$(comm -13 <(echo "$EN_KEYS") <(echo "$ZH_KEYS"))
    if [ -n "$MISSING_IN_ZH" ]; then
        echo "⚠️  Missing in zh-CN:"
        echo "$MISSING_IN_ZH" | sed 's/^/  /'
    fi
    if [ -n "$MISSING_IN_EN" ]; then
        echo "⚠️  Missing in en-US:"
        echo "$MISSING_IN_EN" | sed 's/^/  /'
    fi
    if [ -z "$MISSING_IN_ZH" ] && [ -z "$MISSING_IN_EN" ]; then
        echo "✅ All translation keys are in sync"
    fi
