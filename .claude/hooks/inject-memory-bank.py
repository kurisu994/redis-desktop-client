#!/usr/bin/env python3
"""按代码路径触发的 memory-bank 规范注入。

会话读写某个源码文件时，扫描 memory-bank/ 下带 `paths:` frontmatter 的规范文档，
把 glob 命中的那几份注入到上下文里。三个平台共用这一个引擎：

- Claude Code：PostToolUse，事后注入，不打断操作
- Codex：PreToolUse（含 apply_patch），命中时先拒一次，模型读完规范重试即放行
- OpenCode：由 .opencode/plugins/inject-memory-bank.js 调用，同 PreToolUse 语义

设计要点：
- 同一份规范在一个会话内只注入一次；规范内容改了会重新注入。
- 编辑规范文档自身时，清掉它的注入记录，让下次碰到相关代码立即生效。
- 「先拒一次」与去重机制自洽：重试时该规范已记录，不会再拒，因此不会死循环。
- 任何异常都静默退出，绝不打断用户的正常工作。

无外部依赖，frontmatter 为手写解析（只认 name / description / paths 三个字段）。
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path

# 目录与容量约定
BANK_DIR = "memory-bank"
MAX_SPEC_CHARS = 9400  # 单份规范上限，超出则截断
MAX_TOTAL_CHARS = 9500  # 单次注入总量上限，超出的降级为索引行
STATE_DIR = "~/.cache/memory-bank-inject"
# apply_patch 补丁头，形如 `*** Update File: src/a.ts`
PATCH_PATH_RE = re.compile(r"^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$")


def find_root(start: Path) -> Path | None:
    """从 start 向上找到包含 memory-bank/ 的项目根目录。"""
    for d in [start, *start.parents]:
        if (d / BANK_DIR).is_dir():
            return d
    return None


def glob_to_regex(pattern: str) -> re.Pattern[str]:
    """把 glob 转成正则。`**` 跨目录，`*` 与 `?` 不跨目录。

    先处理 `/**/` 这种「中间任意层级（也可以是零层）」的写法，
    避免 `src/**/*.ts` 漏掉 `src/a.ts`。
    """
    placeholder_any = "\x00"  # ** 占位
    placeholder_one = "\x01"  # * 占位
    p = pattern.replace("/**/", "/\x02/")  # 可选中间层级占位
    p = p.replace("**", placeholder_any)
    p = p.replace("*", placeholder_one)
    p = p.replace("?", "\x03")

    out = []
    for ch in p:
        if ch == placeholder_any:
            out.append(".*")
        elif ch == placeholder_one:
            out.append("[^/]*")
        elif ch == "\x02":
            out.append("\x02")  # 稍后整体替换
        elif ch == "\x03":
            out.append("[^/]")
        else:
            out.append(re.escape(ch))
    regex = "".join(out).replace("/\x02/", "/(?:.*/)?")
    return re.compile(f"^{regex}$")


def patch_paths(command: str) -> list[str]:
    """从 apply_patch 补丁文本的头部行里解析出涉及的文件路径。

    Codex 与 OpenCode 的 apply_patch 工具传的是整段补丁而非结构化路径，
    补丁头的形如 `*** Update File: src/a.ts`。
    """
    paths: list[str] = []
    for line in command.splitlines():
        m = PATCH_PATH_RE.fullmatch(line.strip())
        if m:
            p = m.group(1).strip()
            if p and p not in paths:
                paths.append(p)
    return paths


def parse_frontmatter(text: str) -> dict[str, object]:
    """解析文件头部的 YAML frontmatter，只取 name / description / paths。"""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    meta: dict[str, object] = {}
    paths: list[str] = []
    in_paths = False
    for line in text[3:end].splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if in_paths and stripped.startswith("- "):
            paths.append(stripped[2:].strip().strip("'\""))
            continue
        in_paths = False
        if ":" not in stripped:
            continue
        key, _, value = stripped.partition(":")
        key = key.strip()
        value = value.strip().strip("'\"")
        if key == "paths":
            in_paths = True
            if value:  # 支持 paths: [a, b] 的行内写法
                paths.extend(v.strip().strip("'\"") for v in value.strip("[]").split(",") if v.strip())
        elif key in ("name", "description"):
            meta[key] = value
    if paths:
        meta["paths"] = paths
    return meta


def load_specs(root: Path) -> list[dict[str, object]]:
    """加载 memory-bank/ 下所有带 paths 的规范文档（不含子目录）。"""
    specs = []
    for md in sorted((root / BANK_DIR).glob("*.md")):
        try:
            text = md.read_text(encoding="utf-8")
        except OSError:
            continue
        meta = parse_frontmatter(text)
        patterns = meta.get("paths")
        if not patterns:
            continue
        specs.append(
            {
                "name": meta.get("name") or md.stem,
                "description": meta.get("description", ""),
                "rel": md.relative_to(root).as_posix(),
                "body": text,
                "hash": hashlib.sha1(text.encode("utf-8")).hexdigest()[:12],
                "regexes": [glob_to_regex(str(p)) for p in patterns],
            }
        )
    return specs


def state_file(root: Path, session_id: str) -> Path:
    """会话级注入记录的存放位置（按项目路径分片，避免多项目串味）。"""
    project = hashlib.sha1(str(root).encode("utf-8")).hexdigest()[:16]
    safe_session = re.sub(r"[^A-Za-z0-9_-]", "_", session_id or "default")[:64]
    return Path(os.path.expanduser(STATE_DIR)) / project / f"{safe_session}.json"


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return

    cwd = Path(data.get("cwd") or os.getcwd())
    root = find_root(cwd)
    if root is None:
        return

    session_id = str(data.get("session_id") or "")

    # /clear 与 /compact 会把已注入的规范挤出上下文，注入记录必须跟着清空，
    # 否则这些规范在本会话剩余时间里再也不会重新注入。
    if data.get("hook_event_name") == "SessionStart":
        try:
            state_file(root, session_id).unlink(missing_ok=True)
        except OSError:
            pass
        return

    tool_input = data.get("tool_input") or data.get("toolInput") or {}
    if not isinstance(tool_input, dict):
        return

    # Claude Code 传结构化的 file_path；Codex / OpenCode 的 apply_patch 传补丁全文，
    # 需要从补丁头里把涉及的文件路径解析出来（一次补丁可能改多个文件）。
    tool_name = str(data.get("tool_name") or data.get("toolName") or "")
    raw_paths: list[str] = []
    if tool_name == "apply_patch":
        command = tool_input.get("command") or tool_input.get("patchText")
        if isinstance(command, str):
            raw_paths = patch_paths(command)
    else:
        fp = tool_input.get("file_path") or tool_input.get("filePath")
        if isinstance(fp, str) and fp.strip():
            raw_paths = [fp.strip()]
    if not raw_paths:
        return

    targets: list[str] = []
    root_resolved = root.resolve()
    for rp in raw_paths:
        try:
            # 补丁头里的路径是相对项目根的，不能按进程 cwd 解析——
            # hook 未必在项目根被拉起，那样会解析到别的目录去。
            p = Path(rp)
            t = (p if p.is_absolute() else root / p).resolve().relative_to(root_resolved).as_posix()
        except (ValueError, OSError):
            continue
        if t not in targets:
            targets.append(t)
    if not targets:
        return
    target = targets[0]  # 用于文案展示与「编辑规范自身」判定

    state_path = state_file(root, session_id)
    try:
        seen = json.loads(state_path.read_text(encoding="utf-8"))
        if not isinstance(seen, dict):
            seen = {}
    except (OSError, ValueError):
        seen = {}

    # 编辑规范文档自身：清掉它的记录，让改动下次即刻重新注入
    if all(t.startswith(f"{BANK_DIR}/") for t in targets):
        changed = False
        for t in targets:
            changed = seen.pop(Path(t).stem, None) is not None or changed
        if changed:
            try:
                state_path.parent.mkdir(parents=True, exist_ok=True)
                state_path.write_text(json.dumps(seen), encoding="utf-8")
            except OSError:
                pass
        return

    matched = [
        s for s in load_specs(root)
        if any(r.match(t) for r in s["regexes"] for t in targets)
        and seen.get(s["name"]) != s["hash"]
    ]
    if not matched:
        return

    header = f"<memory-bank-context>\n以下项目规范与你刚接触的 `{target}` 相关，请在本次改动中遵守：\n\n"
    footer = "\n</memory-bank-context>"
    # 预算要扣掉外层包裹，否则累加出来的总量会超出 additionalContext 上限
    blocks, budget = [], MAX_TOTAL_CHARS - len(header) - len(footer)

    for spec in matched:
        seen[spec["name"]] = spec["hash"]
        body = str(spec["body"])
        if len(body) > MAX_SPEC_CHARS:
            body = body[:MAX_SPEC_CHARS] + "\n\n…（已截断，完整内容见该文件）"
        # 用标签包裹而非 markdown 标题，避免和规范正文里的 ### 小节混淆
        block = f'<spec path="{spec["rel"]}">\n{body}\n</spec>'
        if len(block) + 2 <= budget:  # +2 为块间分隔的空行
            blocks.append(block)
            budget -= len(block) + 2
        else:
            # 预算耗尽，降级为索引行，让模型知道有这份规范可以自己去读
            blocks.append(
                f'<spec path="{spec["rel"]}" truncated="true">\n'
                f"{spec['description']}（内容较长，需要时请直接读取该文件）\n</spec>"
            )

    try:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(seen), encoding="utf-8")
    except OSError:
        pass

    payload = header + "\n\n".join(blocks) + footer
    event_name = data.get("hook_event_name", "PostToolUse")
    out: dict[str, object] = {
        "hookEventName": event_name,
        "additionalContext": payload,
    }
    # PreToolUse（Codex / OpenCode）没法给当前这轮补上下文，只能先拒掉这次调用，
    # 让模型读到规范后重试；重试时本份规范已记录过，不会再拒第二次。
    if event_name == "PreToolUse":
        out["permissionDecision"] = "deny"
        out["permissionDecisionReason"] = "已注入相关项目规范，请阅读后重试同一操作。"
    print(json.dumps({"hookSpecificOutput": out}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass  # hook 永不打断主流程
