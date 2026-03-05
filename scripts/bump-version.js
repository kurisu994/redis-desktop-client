#!/usr/bin/env node

/**
 * 版本号同步脚本
 * 将指定版本号同步到 package.json、src-tauri/Cargo.toml、src-tauri/tauri.conf.json
 * 用法: node scripts/bump-version.js <version>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];
if (!version) {
  console.error("用法: node scripts/bump-version.js <version>");
  console.error("示例: node scripts/bump-version.js 0.2.0");
  process.exit(1);
}

// 验证版本号格式
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`无效的版本号: ${version}`);
  process.exit(1);
}

const root = path.resolve(__dirname, "..");

// 1. package.json
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`✅ package.json → ${version}`);

// 2. src-tauri/Cargo.toml
const cargoPath = path.join(root, "src-tauri", "Cargo.toml");
let cargo = fs.readFileSync(cargoPath, "utf-8");
cargo = cargo.replace(
  /^version\s*=\s*"[^"]+"/m,
  `version = "${version}"`
);
fs.writeFileSync(cargoPath, cargo);
console.log(`✅ Cargo.toml → ${version}`);

// 3. src-tauri/tauri.conf.json
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`✅ tauri.conf.json → ${version}`);

console.log(`\n🎉 版本号已同步到 ${version}`);
