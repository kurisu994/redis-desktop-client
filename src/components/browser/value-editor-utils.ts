/** Hex dump 最大处理字节数（256KB），超出部分截断以避免页面渲染卡顿 */
export const HEX_MAX_BYTES = 256 * 1024;

/** JSON 校验错误的定位信息 */
export interface JsonValidationIssue {
  message: string;
  position: number;
  line: number;
  column: number;
  lineText: string;
  pointerOffset: number;
}

/** JSON 校验结果 */
export type JsonValidationResult =
  | { ok: true; parsed: unknown }
  | { ok: false; issue: JsonValidationIssue };

/** 将字符串转换为 Hex dump 格式（地址 + 十六进制 + ASCII），支持截断 */
export function toHexDump(
  str: string,
  maxBytes = HEX_MAX_BYTES,
): { content: string; truncated: boolean } {
  const lines: string[] = [];
  const allBytes = new TextEncoder().encode(str);
  const truncated = allBytes.length > maxBytes;
  const bytes = truncated ? allBytes.slice(0, maxBytes) : allBytes;

  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const addr = i.toString(16).padStart(8, "0");
    const hexParts: string[] = [];
    const asciiParts: string[] = [];

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        hexParts.push(chunk[j].toString(16).padStart(2, "0"));
        asciiParts.push(
          chunk[j] >= 0x20 && chunk[j] <= 0x7e
            ? String.fromCharCode(chunk[j])
            : ".",
        );
      } else {
        hexParts.push("  ");
        asciiParts.push(" ");
      }
    }

    // 每 8 个字节加一个额外空格，方便阅读二进制内容
    const hex =
      hexParts.slice(0, 8).join(" ") + "  " + hexParts.slice(8).join(" ");
    lines.push(`${addr}  ${hex}  |${asciiParts.join("")}|`);
  }

  return { content: lines.join("\n"), truncated };
}

/** 在 textarea 当前选区插入文本，并在 React 更新后恢复光标位置 */
export function insertTextAtSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  text: string,
  onChange: (value: string) => void,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextValue = value.slice(0, start) + text + value.slice(end);
  onChange(nextValue);

  requestAnimationFrame(() => {
    textarea.selectionStart = start + text.length;
    textarea.selectionEnd = start + text.length;
  });
}

/** 根据字符位置计算行列和当前行文本 */
function getTextPosition(value: string, position: number) {
  const safePosition = Math.min(Math.max(position, 0), value.length);
  let line = 1;
  let column = 1;
  let lineStart = 0;

  for (let i = 0; i < safePosition; i++) {
    if (value[i] === "\n") {
      line++;
      column = 1;
      lineStart = i + 1;
    } else {
      column++;
    }
  }

  const nextLineBreak = value.indexOf("\n", lineStart);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const fullLineText = value.slice(lineStart, lineEnd).replace(/\r$/, "");
  const columnIndex = Math.max(column - 1, 0);

  // 大型压缩 JSON 可能只有一行，错误预览只截取错误点附近内容。
  if (fullLineText.length > 160) {
    const start = Math.max(columnIndex - 80, 0);
    const end = Math.min(start + 160, fullLineText.length);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < fullLineText.length ? "..." : "";
    const lineText = `${prefix}${fullLineText.slice(start, end)}${suffix}`;

    return {
      line,
      column,
      lineText,
      pointerOffset: prefix.length + columnIndex - start,
    };
  }

  return {
    line,
    column,
    lineText: fullLineText,
    pointerOffset: columnIndex,
  };
}

/** 从 JSON.parse 的错误信息中提取最接近的错误字符位置 */
function getJsonErrorPosition(value: string, message: string) {
  const positionMatch = message.match(/position\s+(\d+)/i);
  if (positionMatch) return Number(positionMatch[1]);

  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch) {
    const targetLine = Number(lineColumnMatch[1]);
    const targetColumn = Number(lineColumnMatch[2]);
    let line = 1;
    let column = 1;
    for (let i = 0; i < value.length; i++) {
      if (line === targetLine && column === targetColumn) return i;
      if (value[i] === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
  }

  const tokenMatch = message.match(/Unexpected token '(.+?)'/i);
  if (tokenMatch) {
    const token = tokenMatch[1];
    const tokenPosition = value.indexOf(token);
    if (tokenPosition >= 0) return tokenPosition;
  }

  return value.length;
}

/** 校验 JSON 文本，并返回可展示的错误位置 */
export function validateJson(value: string): JsonValidationResult {
  try {
    return { ok: true, parsed: JSON.parse(value) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const position = getJsonErrorPosition(value, message);
    const location = getTextPosition(value, position);

    return {
      ok: false,
      issue: {
        message,
        position,
        ...location,
      },
    };
  }
}

/** 格式化 JSON；失败时返回校验错误，不修改原文 */
export function formatJsonWithValidation(value: string):
  | { ok: true; formatted: string }
  | { ok: false; issue: JsonValidationIssue } {
  const result = validateJson(value);
  if (!result.ok) return result;

  return { ok: true, formatted: JSON.stringify(result.parsed, null, 2) };
}

/** 聚焦 JSON 错误位置，并选中最接近的错误字符 */
export function focusJsonIssue(
  textarea: HTMLTextAreaElement | null,
  issue: JsonValidationIssue,
) {
  if (!textarea) return;

  requestAnimationFrame(() => {
    const start = Math.min(issue.position, textarea.value.length);
    const end = Math.min(start + 1, textarea.value.length);
    textarea.focus();
    textarea.setSelectionRange(start, end);
  });
}
