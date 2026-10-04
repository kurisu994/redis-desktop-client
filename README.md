# Redis Desktop Client

English | [简体中文](README.zh-CN.md)

A cross-platform Redis desktop client built with Tauri 2, Next.js 16, and shadcn/ui.

Browse and edit Redis data, manage connections, run commands, monitor servers, and work with Pub/Sub in one desktop app.

The interface follows your preferred system language: Chinese locales use Simplified Chinese, and other locales fall back to English. You can change the language in the language menu or Settings; a saved choice takes priority.

## Installation

Download a package from [Releases](https://github.com/kurisu994/redis-desktop-client/releases).

| Platform                      | Package                        |
| ----------------------------- | ------------------------------ |
| macOS (Apple Silicon / Intel) | `.dmg`                         |
| Windows (x64)                 | `.exe` installer or `.msi`     |
| Linux (x64)                   | `.AppImage`, `.deb`, or `.rpm` |

> [!NOTE]
> macOS and Windows packages are not currently code-signed, so the operating system may show a warning when you first open the app.

### macOS

If macOS reports that the app is damaged after installing the `.dmg`, verify that you downloaded it from this repository's Releases page, then remove the quarantine attribute:

```bash
xattr -cr /Applications/Redis\ Desktop\ Client.app
```

Open the app again.

### Windows

If SmartScreen shows **Windows protected your PC**, select **More info**, then **Run anyway** after checking that the installer came from this repository's Releases page.

### Linux

Make the AppImage executable, then run it:

```bash
chmod +x Redis.Desktop.Client_*.AppImage
./Redis.Desktop.Client_*.AppImage
```

## Features and technology

- **Data browser:** String, Hash, List, Set, Sorted Set, Stream, and RedisJSON support, with tree and list views, TTL management, and import/export.
- **Connections:** Standalone, Sentinel, Cluster, SSL/TLS, and multiple SSH hops with known_hosts verification and trust on first use. SSH currently supports Standalone connections only.
- **Tools:** Command console, server monitoring, slow logs, MONITOR logs, and Pub/Sub.
- **Interface:** Light and dark themes, English and Simplified Chinese, keyboard shortcuts, and a command palette.
- **Desktop:** Tauri 2.x with a Rust (Edition 2021), Tokio, redis-rs, and russh backend.
- **Frontend:** Next.js 16 (Turbopack), React 19, TypeScript, shadcn/ui, Tailwind CSS 4.x, Zustand 5.x, i18next, react-i18next, and lucide-react.
- **Value editor:** Native textarea with a JSON highlighting overlay and hex dump, with selectable formats.
- **Updates:** Tauri Updater with Ed25519 signature verification and optional HTTP/HTTPS update proxies.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS; CI uses Node.js 22)
- [pnpm](https://pnpm.io/) 10
- [Rust](https://rustup.rs/) (stable; the package declares MSRV 1.77.2)
- [just](https://github.com/casey/just), the command runner
- [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/)

Use **Ubuntu 22.04** for distributable Linux builds to preserve GLIBC compatibility. CI and Release use the same baseline. See [Tauri's AppImage limitations](https://v2.tauri.app/distribute/appimage/#limitations).

### Install dependencies

```bash
just install
```

### Run the app

```bash
# Full Tauri development environment with frontend and backend hot reload
just dev

# Frontend only at localhost:3000
just dev-web
```

### Build

```bash
# Production desktop build
just build

# Frontend static export only
just build-web
```

## Commands

| Command              | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `just dev`           | Start Tauri development mode                                        |
| `just dev-web`       | Start the frontend only                                             |
| `just build`         | Build the production app; loads `.env` for signed updater artifacts |
| `just build-web`     | Build the Next.js frontend                                          |
| `just build-debug`   | Build a debug app with symbols                                      |
| `just lint`          | Run ESLint, TypeScript checks, and Clippy                           |
| `just lint-web`      | Run ESLint and TypeScript checks                                    |
| `just lint-rust`     | Run Clippy                                                          |
| `just fmt`           | Format frontend and Rust code                                       |
| `just fmt-web`       | Format frontend code with Prettier                                  |
| `just fmt-rust`      | Format Rust code with cargo fmt                                     |
| `just test-rust`     | Run Rust unit tests                                                 |
| `just i18n-check`    | Check translation key consistency                                   |
| `just version <ver>` | Synchronize project version fields                                  |
| `just release <tag>` | Update the version, commit, tag, and push to trigger a release      |
| `just clean`         | Remove build outputs                                                |

### AppImage validation (Linux)

```bash
just test-appimage
just check-appimage /path/to/Redis.Desktop.Client.AppImage
just smoke-appimage /path/to/Redis.Desktop.Client.AppImage /tmp/appimage-smoke
```

The smoke check requires `xvfb`, `xdotool`, `imagemagick`, `dbus-x11`, `locales`, and `fonts-noto-cjk`, with the `en_US.UTF-8`, `de_DE.UTF-8`, and `zh_CN.UTF-8` locales generated. It checks that a window remains visible for 20 seconds in each environment and saves logs and screenshots for language review.

## Project structure

```text
src/                        # Frontend source
├── app/                    # Next.js App Router, layout, and global styles
├── components/
│   ├── providers.tsx       # Theme, tooltips, toasts, and i18n
│   ├── error-boundary.tsx
│   ├── command-palette.tsx
│   ├── update-dialog.tsx
│   ├── ssh-tofu-dialog.tsx # First-use SSH fingerprint confirmation
│   ├── confirm-danger-dialog.tsx
│   ├── ui/                # Shared shadcn/ui components
│   ├── layout/            # Title bar, sidebar, tabs, settings, welcome page
│   ├── browser/           # Key lists, tree, and detail views
│   │   └── viewers/        # Type-specific value viewers and editors
│   ├── cli/               # Command console
│   ├── connection/        # Connection dialogs and import/export
│   ├── monitor/           # Server information, charts, slow logs, MONITOR
│   └── pubsub/            # Publish and subscribe
├── hooks/                 # Shortcuts, drag ordering, updates, SSH TOFU
├── lib/                   # Tauri IPC wrappers, update settings, utilities
├── stores/                # App, connection, browser, CLI, monitor, Pub/Sub
└── i18n/                  # Language configuration and translations

src-tauri/                 # Rust backend
├── src/
│   ├── lib.rs             # Tauri entry point
│   ├── commands/          # IPC commands
│   ├── redis/             # Redis clients and SSH tunnels
│   └── config/            # Encrypted settings and SSH known_hosts storage
└── tauri.conf.json

docs/                      # Product requirements and development plans
scripts/                   # Build, release, and AppImage validation tools
AGENTS.md                  # Contributor guidance for coding assistants
CHANGELOG.md               # Release history
memory-bank/               # Project conventions and task context
```

## License

[MIT](LICENSE)
