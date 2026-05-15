"use client";

import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEventHandler,
  type RefObject,
} from "react";

type JsonTokenType =
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "punctuation"
  | "plain";

interface JsonToken {
  text: string;
  type: JsonTokenType;
}

interface JsonHighlightEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  readOnly?: boolean;
  wrap?: "soft" | "off";
  invalid?: boolean;
  paddingClassName?: string;
  className?: string;
}

const JSON_HIGHLIGHT_MAX_CHARS = 256 * 1024;

const TOKEN_CLASS_NAMES: Record<JsonTokenType, string> = {
  key: "text-[var(--json-key-name-color)]",
  string: "text-[var(--json-string-color)]",
  number: "text-[var(--json-number-color)]",
  boolean: "text-[var(--json-boolean-color)]",
  null: "text-[var(--json-null-color)]",
  punctuation: "text-muted-foreground",
  plain: "text-foreground",
};

/** 判断字符串字面量后面是否紧跟冒号，用于区分 JSON key 和字符串值 */
function isJsonKey(value: string, index: number) {
  let cursor = index;
  while (cursor < value.length && /\s/.test(value[cursor])) cursor++;
  return value[cursor] === ":";
}

/** 将 JSON 文本切分为可渲染的语法 token，非法 JSON 也尽量保留局部高亮 */
function tokenizeJson(value: string): JsonToken[] {
  if (value.length > JSON_HIGHLIGHT_MAX_CHARS) {
    return [{ text: value, type: "plain" }];
  }

  const tokens: JsonToken[] = [];
  let index = 0;

  while (index < value.length) {
    const char = value[index];

    if (char === '"') {
      const start = index;
      index++;
      let escaped = false;

      while (index < value.length) {
        const current = value[index];
        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === '"') {
          index++;
          break;
        }
        index++;
      }

      tokens.push({
        text: value.slice(start, index),
        type: isJsonKey(value, index) ? "key" : "string",
      });
      continue;
    }

    const rest = value.slice(index);
    const numberMatch = rest.match(
      /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/,
    );
    if (numberMatch) {
      tokens.push({ text: numberMatch[0], type: "number" });
      index += numberMatch[0].length;
      continue;
    }
    if (/[-0-9]/.test(char)) {
      tokens.push({ text: char, type: "plain" });
      index++;
      continue;
    }

    if (rest.startsWith("true") || rest.startsWith("false")) {
      const text = rest.startsWith("true") ? "true" : "false";
      tokens.push({ text, type: "boolean" });
      index += text.length;
      continue;
    }

    if (rest.startsWith("null")) {
      tokens.push({ text: "null", type: "null" });
      index += 4;
      continue;
    }

    if ("{}[]:,".includes(char)) {
      tokens.push({ text: char, type: "punctuation" });
      index++;
      continue;
    }

    const plainStart = index;
    while (
      index < value.length &&
      value[index] !== '"' &&
      !"{}[]:,".includes(value[index]) &&
      !/[-0-9]/.test(value[index]) &&
      !value.startsWith("true", index) &&
      !value.startsWith("false", index) &&
      !value.startsWith("null", index)
    ) {
      index++;
    }

    tokens.push({ text: value.slice(plainStart, index), type: "plain" });
  }

  return tokens;
}

/** 给原生 textarea 增加 JSON 语法高亮叠层，保留原生输入和 IME 行为 */
export const JsonHighlightEditor = forwardRef<
  HTMLTextAreaElement,
  JsonHighlightEditorProps
>(function JsonHighlightEditor(
  {
    value,
    onValueChange,
    onKeyDown,
    readOnly = false,
    wrap = "soft",
    invalid = false,
    paddingClassName = "p-4",
    className = "",
  },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const tokens = useMemo(() => tokenizeJson(value), [value]);
  const wrapClassName =
    wrap === "off" ? "whitespace-pre" : "whitespace-pre-wrap break-words";

  /** 同步内部 ref 和父组件 ref，用于外部聚焦错误位置 */
  const setTextAreaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as RefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [forwardedRef],
  );

  /** 让高亮层跟随 textarea 滚动，保证彩色文本和输入内容对齐 */
  const handleScroll = () => {
    if (!textareaRef.current || !highlightRef.current) return;

    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-background ${
        invalid ? "bg-destructive/5 ring-1 ring-inset ring-destructive/50" : ""
      } ${className}`}
    >
      <pre
        ref={highlightRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${wrapClassName} ${paddingClassName} font-mono text-sm leading-5`}
      >
        {tokens.map((token, index) => (
          <span key={index} className={TOKEN_CLASS_NAMES[token.type]}>
            {token.text}
          </span>
        ))}
        {value.endsWith("\n") ? " " : null}
      </pre>
      <textarea
        ref={setTextAreaRef}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        readOnly={readOnly}
        wrap={wrap}
        spellCheck={false}
        aria-invalid={invalid}
        className={`relative h-full w-full resize-none border-0 bg-transparent ${wrapClassName} ${paddingClassName} font-mono text-sm leading-5 text-transparent caret-foreground outline-none selection:bg-primary/25 selection:text-transparent focus:ring-0 read-only:cursor-default`}
      />
    </div>
  );
});
