/** 更新代理配置 */
export interface UpdateProxyConfig {
  enabled: boolean;
  url: string;
}

/** 更新代理地址校验错误 */
export type UpdateProxyValidationError =
  | "empty"
  | "invalidUrl"
  | "unsupportedProtocol";

const STORAGE_KEY_UPDATE_PROXY_ENABLED = "update-proxy-enabled";
const STORAGE_KEY_UPDATE_PROXY_URL = "update-proxy-url";

/** 规范化更新代理地址 */
export function normalizeUpdateProxyUrl(url: string): string {
  return url.trim();
}

/** 校验更新代理地址是否符合第一阶段支持范围 */
export function validateUpdateProxyUrl(
  url: string,
): UpdateProxyValidationError | null {
  const normalizedUrl = normalizeUpdateProxyUrl(url);
  if (!normalizedUrl) return "empty";

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "unsupportedProtocol";
    }
    if (!parsedUrl.hostname) return "invalidUrl";
    return null;
  } catch {
    return "invalidUrl";
  }
}

/** 读取更新代理配置 */
export function getUpdateProxyConfig(): UpdateProxyConfig {
  if (typeof window === "undefined") {
    return { enabled: false, url: "" };
  }

  return {
    enabled: localStorage.getItem(STORAGE_KEY_UPDATE_PROXY_ENABLED) === "true",
    url: localStorage.getItem(STORAGE_KEY_UPDATE_PROXY_URL) ?? "",
  };
}

/** 保存更新代理配置 */
export function setUpdateProxyConfig(config: UpdateProxyConfig): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY_UPDATE_PROXY_ENABLED,
    String(config.enabled),
  );
  localStorage.setItem(
    STORAGE_KEY_UPDATE_PROXY_URL,
    normalizeUpdateProxyUrl(config.url),
  );
}

/** 获取当前启用的更新代理地址 */
export function getActiveUpdateProxyUrl(): string | undefined {
  const config = getUpdateProxyConfig();
  if (!config.enabled) return undefined;

  const proxyUrl = normalizeUpdateProxyUrl(config.url);
  return proxyUrl || undefined;
}
