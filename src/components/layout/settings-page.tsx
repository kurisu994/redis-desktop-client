"use client";

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
import { useTheme } from "next-themes";
import { useAppStore } from "@/stores/app-store";
import { Settings, Globe, Palette, Keyboard } from "lucide-react";

/** 设置页面 */
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { keySeparator, setKeySeparator } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} />
          <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
        </div>

        {/* 外观 */}
        <SectionHeader icon={<Palette size={16} />} title={t("settings.appearance")} />
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
            <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
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
        <SectionHeader icon={<Globe size={16} />} title={t("settings.general")} />
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

        {/* 快捷键说明 */}
        <SectionHeader icon={<Keyboard size={16} />} title={t("shortcuts.title")} />
        <div className="flex flex-col gap-2 mb-6">
          <ShortcutRow label={t("shortcuts.commandPalette")} keys={["⌘", "K"]} />
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
        <SectionHeader icon={<Settings size={16} />} title={t("settings.about")} />
        <div className="text-sm text-muted-foreground">
          <p>{t("settings.currentVersion")}: 0.2.0</p>
        </div>
      </div>
    </div>
  );
}

/** 设置区域标题 */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
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
          <kbd
            key={i}
            className="px-2 py-0.5 text-xs bg-muted rounded border"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
