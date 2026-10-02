import assert from "node:assert/strict";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkAppDir } from "./check-appimage.mjs";

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "rdc-appdir-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "Redis Desktop Client.AppDir");
  mkdirSync(join(root, "usr/share/applications"), { recursive: true });
  writeFileSync(join(root, "AppRun"), "#!/bin/sh\nexit 0\n");
  chmodSync(join(root, "AppRun"), 0o755);
  copyFileSync(
    new URL("../src-tauri/icons/128x128.png", import.meta.url),
    join(root, "Redis Desktop Client.png"),
  );
  symlinkSync("Redis Desktop Client.png", join(root, ".DirIcon"));
  symlinkSync(
    "Redis Desktop Client.png",
    join(root, "redis-desktop-client.png"),
  );
  writeFileSync(
    join(root, "usr/share/applications/Redis Desktop Client.desktop"),
    "[Desktop Entry]\nType=Application\nName=Redis Desktop Client\nExec=redis-desktop-client\nIcon=redis-desktop-client\n",
  );
  symlinkSync(
    "usr/share/applications/Redis Desktop Client.desktop",
    join(root, "Redis Desktop Client.desktop"),
  );
  return root;
}

test("relative icon and desktop links still resolve after moving the AppDir", (t) => {
  const root = fixture(t);
  const moved = `${root}.moved`;
  renameSync(root, moved);
  assert.doesNotThrow(() => checkAppDir(moved));
});

test("rejects the v0.2.9 absolute .DirIcon even while its target exists", (t) => {
  const root = fixture(t);
  rmSync(join(root, ".DirIcon"));
  symlinkSync(join(root, "Redis Desktop Client.png"), join(root, ".DirIcon"));
  assert.throws(() => checkAppDir(root), /absolute symlink/);
});

test("rejects dangling and missing .DirIcon", (t) => {
  const root = fixture(t);
  rmSync(join(root, "Redis Desktop Client.png"));
  assert.throws(() => checkAppDir(root), /ENOENT/);
  rmSync(join(root, ".DirIcon"));
  assert.throws(() => checkAppDir(root), /ENOENT/);
});

test("rejects a non-PNG .DirIcon", (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "Redis Desktop Client.png"), "not an icon");
  assert.throws(() => checkAppDir(root), /not a PNG/);
});

test("requires one desktop file and its matching root icon", (t) => {
  const root = fixture(t);
  rmSync(join(root, "redis-desktop-client.png"));
  assert.throws(() => checkAppDir(root), /Missing desktop icon/);
  rmSync(join(root, "Redis Desktop Client.desktop"));
  assert.throws(() => checkAppDir(root), /exactly one/);
});

test("rejects relative links escaping the AppDir", (t) => {
  const root = fixture(t);
  const outside = join(root, "..", "outside.png");
  copyFileSync(join(root, "Redis Desktop Client.png"), outside);
  rmSync(join(root, ".DirIcon"));
  symlinkSync("../outside.png", join(root, ".DirIcon"));
  assert.throws(() => checkAppDir(root), /escapes the AppDir/);
});
