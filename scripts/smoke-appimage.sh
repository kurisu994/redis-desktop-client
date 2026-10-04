#!/usr/bin/env bash
# Run the built AppImage in fresh profiles; no Redis server or FUSE is required.
# Invoke via `just smoke-appimage <AppImage> <output-dir>` on Linux.
set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <AppImage> <output-dir>" >&2
    exit 1
fi

appimage=$(realpath "$1")
output=$(realpath -m "$2")
mkdir -p "$output"
temporary=$(mktemp -d)
app_pid=""

stop_app() {
    if [[ -n "$app_pid" ]]; then
        # setsid isolates the app and its WebKit subprocesses from the test runner.
        kill -TERM -- "-$app_pid" 2>/dev/null || true
        sleep 1
        kill -KILL -- "-$app_pid" 2>/dev/null || true
        wait "$app_pid" 2>/dev/null || true
        app_pid=""
    fi
}

cleanup() {
    stop_app
    rm -rf "$temporary"
}
trap cleanup EXIT

# Extract once to avoid depending on FUSE on the CI runner.
(cd "$temporary" && "$appimage" --appimage-extract > "$output/extract.log")

for locale in en_US.UTF-8 de_DE.UTF-8 zh_CN.UTF-8; do
    profile="$temporary/$locale"
    mkdir -p "$profile" "$profile/runtime"
    chmod 700 "$profile/runtime"
    env HOME="$profile" XDG_CONFIG_HOME="$profile/config" \
        XDG_DATA_HOME="$profile/data" XDG_CACHE_HOME="$profile/cache" \
        XDG_RUNTIME_DIR="$profile/runtime" \
        LANG="$locale" LC_ALL="$locale" LANGUAGE="$locale" \
        GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 \
        WEBKIT_DISABLE_COMPOSITING_MODE=1 \
        setsid "$temporary/squashfs-root/AppRun" > "$output/$locale.log" 2>&1 &
    app_pid=$!
    window=""
    # The catalog rejects apps that exit within 11 seconds. Check throughout
    # a longer interval and require an actual mapped application window.
    for ((second = 0; second < 20; second++)); do
        sleep 1
        if ! kill -0 "$app_pid" 2>/dev/null; then
            echo "AppImage exited during startup ($locale)" >&2
            tail -n 80 "$output/$locale.log" >&2
            exit 1
        fi
        window=$(xdotool search --onlyvisible --name '^Redis Desktop Client$' | head -n 1 || true)
    done
    if [[ -z "$window" ]]; then
        echo "AppImage did not show a window ($locale)" >&2
        tail -n 80 "$output/$locale.log" >&2
        exit 1
    fi
    import -window "$window" "$output/$locale.png"
    echo "AppImage startup OK: $locale (20 seconds; screenshot saved)"
    stop_app
done
