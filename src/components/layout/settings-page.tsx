"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useAppStore } from "@/stores/app-store";
import { useUpdateChecker } from "@/hooks/use-update-checker";
import { UpdateDialog } from "@/components/update-dialog";
import { getAppVersion } from "@/lib/tauri-api";
import {
  getUpdateProxyConfig,
  setUpdateProxyConfig,
  validateUpdateProxyUrl,
} from "@/lib/update-settings";
import type {
  UpdateProxyConfig,
  UpdateProxyValidationError,
} from "@/lib/update-settings";
import {
  Settings,
  Globe,
  Palette,
  Keyboard,
  ArrowDownToLine,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/** 当前应用版本号（构建时内联） */
const FALLBACK_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "-";

/** 设置页面 */
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { keySeparator, setKeySeparator } = useAppStore();
  const {
    updateAvailable,
    checking,
    checkError,
    autoUpdateEnabled,
    setAutoUpdate,
    manualCheck,
    dismissUpdate,
  } = useUpdateChecker();
  const [manualCheckDone, setManualCheckDone] = useState(false);
  const [appVersion, setAppVersion] = useState(FALLBACK_APP_VERSION);
  const [updateProxyConfig, setUpdateProxyConfigState] =
    useState<UpdateProxyConfig>(() => getUpdateProxyConfig());
  const { enabled: updateProxyEnabled, url: updateProxyUrl } =
    updateProxyConfig;

  useEffect(() => {
    let cancelled = false;

    getAppVersion()
      .then((version) => {
        if (!cancelled && version) {
          setAppVersion(version);
        }
      })
      .catch((err) => {
        console.warn("[设置] 获取当前版本失败:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** 持久化更新代理配置 */
  const persistUpdateProxyConfig = (enabled: boolean, url: string) => {
    const nextConfig = { enabled, url };
    setManualCheckDone(false);
    setUpdateProxyConfigState(nextConfig);
    setUpdateProxyConfig(nextConfig);
  };

  const proxyValidationError = updateProxyEnabled
    ? validateUpdateProxyUrl(updateProxyUrl)
    : null;
  const proxyValidationMessage = getProxyValidationMessage(
    proxyValidationError,
    t,
  );

  /** 手动检查更新 */
  const handleManualCheck = async () => {
    setManualCheckDone(false);
    const success = await manualCheck();
    // 如果没有可用更新，显示"已是最新"
    setManualCheckDone(success);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} />
          <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
        </div>

        {/* 外观 */}
        <SectionHeader
          icon={<Palette size={16} />}
          title={t("settings.appearance")}
        />
        <div className="flex flex-col gap-4 mb-6">
          <SettingRow label={t("settings.theme")}>
            <Select value={theme || "dark"} onValueChange={setTheme}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                <SelectItem value="light">{t("theme.light")}</SelectItem>
                <SelectItem value="system">{t("theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label={t("settings.language")}>
            <Select
              value={i18n.language}
              onValueChange={(val) => i18n.changeLanguage(val)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">{t("language.zhCN")}</SelectItem>
                <SelectItem value="en-US">{t("language.enUS")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>

        <Separator className="my-4" />

        {/* 通用 */}
        <SectionHeader
          icon={<Globe size={16} />}
          title={t("settings.general")}
        />
        <div className="flex flex-col gap-4 mb-6">
          <SettingRow label={t("settings.keySeparator")}>
            <Input
              value={keySeparator}
              onChange={(e) => setKeySeparator(e.target.value)}
              className="w-20"
            />
          </SettingRow>
        </div>

        <Separator className="my-4" />

        {/* 更新 */}
        <SectionHeader
          icon={<ArrowDownToLine size={16} />}
          title={t("update.title")}
        />
        <div className="flex flex-col gap-4 mb-6">
          <SettingRow label={t("settings.autoUpdate")}>
            <Switch
              checked={autoUpdateEnabled}
              onCheckedChange={setAutoUpdate}
            />
          </SettingRow>
          <SettingRow label={t("settings.updateProxy")}>
            <Switch
              checked={updateProxyEnabled}
              onCheckedChange={(enabled) =>
                persistUpdateProxyConfig(enabled, updateProxyUrl)
              }
            />
          </SettingRow>
          {updateProxyEnabled && (
            <div className="flex flex-col gap-1">
              <SettingRow label={t("settings.updateProxyUrl")}>
                <Input
                  value={updateProxyUrl}
                  onChange={(e) =>
                    persistUpdateProxyConfig(updateProxyEnabled, e.target.value)
                  }
                  placeholder={t("settings.updateProxyPlaceholder")}
                  className="w-72 font-mono"
                />
              </SettingRow>
              <div
                className={`ml-auto w-72 text-xs ${
                  proxyValidationMessage
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {proxyValidationMessage ?? t("settings.updateProxyHint")}
              </div>
            </div>
          )}
          <SettingRow label={t("settings.checkUpdate")}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualCheck}
              disabled={checking || proxyValidationError !== null}
            >
              {checking ? (
                <>
                  <RefreshCw size={14} className="mr-1 animate-spin" />
                  {t("update.checking")}
                </>
              ) : (
                t("settings.checkUpdate")
              )}
            </Button>
          </SettingRow>
          {/* 检查结果提示 */}
          {manualCheckDone && !updateAvailable && !checking && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle size={14} />
              {t("settings.upToDate")}
            </div>
          )}
          {checkError && !checking && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <div>
                <div>{t("settings.updateCheckFailed")}</div>
                <div className="text-xs opacity-80 break-all">{checkError}</div>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* 快捷键说明 */}
        <SectionHeader
          icon={<Keyboard size={16} />}
          title={t("shortcuts.title")}
        />
        <div className="flex flex-col gap-2 mb-6">
          <ShortcutRow
            label={t("shortcuts.commandPalette")}
            keys={["⌘", "K"]}
          />
          <ShortcutRow label={t("shortcuts.newConnection")} keys={["⌘", "N"]} />
          <ShortcutRow label={t("shortcuts.newCliTab")} keys={["⌘", "T"]} />
          <ShortcutRow label={t("shortcuts.search")} keys={["⌘", "F"]} />
          <ShortcutRow label={t("shortcuts.refreshKeys")} keys={["⌘", "R"]} />
          <ShortcutRow label={t("shortcuts.refreshKeysF5")} keys={["F5"]} />
          <ShortcutRow label={t("shortcuts.deleteKey")} keys={["⌘", "D"]} />
          <ShortcutRow label={t("shortcuts.deleteKey")} keys={["Delete"]} />
          <ShortcutRow label={t("shortcuts.saveEdit")} keys={["⌘", "S"]} />
          <ShortcutRow label={t("shortcuts.settings")} keys={["⌘", ","]} />
        </div>

        <Separator className="my-4" />

        {/* 关于 */}
        <SectionHeader
          icon={<Settings size={16} />}
          title={t("settings.about")}
        />
        <div className="text-sm text-muted-foreground">
          <p>
            {t("settings.currentVersion")}: {appVersion}
          </p>
        </div>
      </div>

      {/* 设置页面内的更新弹窗 */}
      <UpdateDialog updateInfo={updateAvailable} onDismiss={dismissUpdate} />
    </div>
  );
}

/** 获取更新代理校验提示文案 */
function getProxyValidationMessage(
  error: UpdateProxyValidationError | null,
  t: (key: string) => string,
): string | null {
  switch (error) {
    case "empty":
      return t("settings.updateProxyRequired");
    case "invalidUrl":
      return t("settings.updateProxyInvalid");
    case "unsupportedProtocol":
      return t("settings.updateProxyUnsupported");
    default:
      return null;
  }
}

/** 设置区域标题 */
function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

/** 设置行 */
function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

/** 快捷键展示行 */
function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd key={i} className="px-2 py-0.5 text-xs bg-muted rounded border">
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
