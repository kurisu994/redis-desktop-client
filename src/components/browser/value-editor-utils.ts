/** Hex dump 最大处理字节数（256KB），超出部分截断以避免页面渲染卡顿 */
export const HEX_MAX_BYTES = 256 * 1024;

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
