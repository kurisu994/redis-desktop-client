#!/usr/bin/env node
/**
 * Git Commit Message 验证脚本
 * 检查提交信息是否符合规范
 */

import fs from "node:fs";
import path from "node:path";

// 获取 commit message 文件路径
const msgPath = process.argv[2] || path.resolve(".git/COMMIT_EDITMSG");
const msg = fs.readFileSync(msgPath, "utf-8").trim();

// 提交类型
const types = [
  "feat", // 新特性
  "fix", // 修复
  "docs", // 文档
  "style", // 样式
  "refactor", // 重构
  "perf", // 性能
  "test", // 测试
  "tests", // 测试
  "chore", // 维护
  "workflow", // 工作流
  "build", // 构建
  "ci", // 持续集成
  "CI", // 持续集成
  "typos", // 拼写错误
  "types", // 类型
  "wip", // 进行中
  "release", // 发布
  "dep", // 依赖
  "locale", // 国际化
];

// 正则：[可选表情] type(可选scope): 描述
const pattern = new RegExp(
  `^(\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F?)?\\s*(${types.join("|")})(\\(.+\\))?:\\s*.{1,50}`,
  "u",
);

// 允许 merge commit
if (/^Merge\s/.test(msg)) {
  process.exit(0);
}

// 允许 revert commit
if (/^Revert\s/.test(msg)) {
  process.exit(0);
}

if (!pattern.test(msg)) {
  console.error("\n\x1b[31m❌ 提交信息格式不正确！\x1b[0m\n");
  console.error("正确格式: [表情] type(scope): 描述");
  console.error("示例: 🚀 feat(用户): 添加登录功能");
  console.error("示例: 🐛 fix: 修复首页加载问题\n");
  console.error(`允许的类型: ${types.join(", ")}\n`);
  console.error(`你的提交信息: "${msg}"\n`);
  process.exit(1);
}

console.log("\x1b[32m✅ 提交信息格式正确\x1b[0m");
process.exit(0);
