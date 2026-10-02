import assert from "node:assert/strict";
import {
  accessSync,
  constants,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Check a relocated AppDir, so links to the build machine cannot pass unnoticed.
export function checkAppDir(directory) {
  const root = realpathSync(directory);
  function requiredFile(name) {
    const file = join(root, name);
    if (lstatSync(file).isSymbolicLink()) {
      assert(!isAbsolute(readlinkSync(file)), `${name}: absolute symlink`);
    }
    const target = realpathSync(file);
    const location = relative(root, target);
    assert(
      location !== ".." &&
        !location.startsWith(`..${sep}`) &&
        !isAbsolute(location),
      `${name}: symlink escapes the AppDir`,
    );
    assert(statSync(target).isFile(), `${name}: not a regular file`);
    return file;
  }

  accessSync(requiredFile("AppRun"), constants.X_OK);
  const icon = readFileSync(requiredFile(".DirIcon"));
  assert(
    icon.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
    ".DirIcon: not a PNG",
  );

  const desktops = readdirSync(root).filter((name) =>
    name.endsWith(".desktop"),
  );
  assert.equal(
    desktops.length,
    1,
    "AppDir must contain exactly one root desktop file",
  );
  const desktop = readFileSync(requiredFile(desktops[0]), "utf8");
  const entry = desktop.split(/^\[Desktop Entry\]\r?$/m)[1]?.split(/^\[/m)[0];
  const iconName = entry?.match(/^Icon=([^\r\n]+)\r?$/m)?.[1];
  assert(
    iconName && !iconName.includes("/") && !iconName.includes("\\"),
    "Invalid desktop Icon entry",
  );
  const appIcon = readdirSync(root).find(
    (name) => name === `${iconName}.png` || name === `${iconName}.svg`,
  );
  assert(appIcon, `Missing desktop icon: ${iconName}`);
  requiredFile(appIcon);
}

export function checkAppImage(file) {
  assert.equal(
    process.platform,
    "linux",
    "AppImage extraction requires Linux; pass an extracted AppDir on macOS",
  );
  const appimage = resolve(file);
  const temporary = mkdtempSync(join(tmpdir(), "rdc-appimage-"));
  try {
    const result = spawnSync(appimage, ["--appimage-extract"], {
      cwd: temporary,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"],
    });
    if (result.error) throw result.error;
    assert.equal(
      result.status,
      0,
      `AppImage extraction failed: ${result.stderr}`,
    );
    checkAppDir(join(temporary, "squashfs-root"));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    assert(
      process.argv.length > 2,
      "Usage: node scripts/check-appimage.mjs <AppImage|AppDir> [...]",
    );
    for (const file of process.argv.slice(2)) {
      if (statSync(file).isDirectory()) checkAppDir(file);
      else checkAppImage(file);
      console.log(`AppImage metadata OK: ${file}`);
    }
  } catch (error) {
    console.error(`AppImage metadata check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
