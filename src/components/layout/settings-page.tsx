"use client";

import { useTranslation } from "react-i18next";
import { Select, SelectItem, Divider, Input } from "@heroui/react";
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
            <Select
              selectedKeys={[theme || "dark"]}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as string;
                if (val) setTheme(val);
              }}
              variant="bordered"
              size="sm"
              className="w-40"
            >
              <SelectItem key="dark">{t("theme.dark")}</SelectItem>
              <SelectItem key="light">{t("theme.light")}</SelectItem>
              <SelectItem key="system">{t("theme.system")}</SelectItem>
            </Select>
          </SettingRow>
          <SettingRow label={t("settings.language")}>
            <Select
              selectedKeys={[i18n.language]}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0] as string;
                if (val) i18n.changeLanguage(val);
              }}
              variant="bordered"
              size="sm"
              className="w-40"
            >
              <SelectItem key="zh-CN">{t("language.zhCN")}</SelectItem>
              <SelectItem key="en-US">{t("language.enUS")}</SelectItem>
            </Select>
          </SettingRow>
        </div>

        <Divider className="my-4" />

        {/* 通用 */}
        <SectionHeader icon={<Globe size={16} />} title={t("settings.general")} />
        <div className="flex flex-col gap-4 mb-6">
          <SettingRow label={t("settings.keySeparator")}>
            <Input
              value={keySeparator}
              onValueChange={setKeySeparator}
              variant="bordered"
              size="sm"
              className="w-20"
            />
          </SettingRow>
        </div>

        <Divider className="my-4" />

        {/* 快捷键说明 */}
        <SectionHeader icon={<Keyboard size={16} />} title={t("shortcuts.title")} />
        <div className="flex flex-col gap-2 mb-6">
          <ShortcutRow label={t("shortcuts.newConnection")} keys={["⌘", "N"]} />
          <ShortcutRow label={t("shortcuts.newCliTab")} keys={["⌘", "T"]} />
          <ShortcutRow label={t("shortcuts.search")} keys={["⌘", "F"]} />
          <ShortcutRow label={t("shortcuts.refreshKeys")} keys={["⌘", "R"]} />
          <ShortcutRow label={t("shortcuts.deleteKey")} keys={["⌘", "⌫"]} />
          <ShortcutRow label={t("shortcuts.settings")} keys={["⌘", ","]} />
        </div>

        <Divider className="my-4" />

        {/* 关于 */}
        <SectionHeader icon={<Settings size={16} />} title={t("settings.about")} />
        <div className="text-sm text-default-500">
          <p>{t("settings.currentVersion")}: 0.1.0</p>
        </div>
      </div>
    </div>
  );
}

/** 设置区域标题 */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-default-500">{icon}</span>
      <h2 className="text-sm font-semibold text-default-700">{title}</h2>
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
      <span className="text-sm text-default-600">{label}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-0.5 text-xs bg-default-100 rounded border border-default-200"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
