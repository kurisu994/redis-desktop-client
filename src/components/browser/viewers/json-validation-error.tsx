"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JsonValidationIssue } from "./value-editor-utils";

interface JsonValidationErrorProps {
  issue: JsonValidationIssue | null;
}

/** 展示 JSON 校验错误、行列位置和错误行高亮片段 */
export function JsonValidationError({ issue }: JsonValidationErrorProps) {
  const { t } = useTranslation();
  if (!issue) return null;

  const lineNumber = String(issue.line);
  const gutter = `${lineNumber} | `;
  const pointer = `${" ".repeat(gutter.length + issue.pointerOffset)}^`;

  return (
    <div
      role="alert"
      className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            <span>{t("valueEditor.jsonErrorTitle")}</span>
            <span className="font-mono text-[11px] opacity-80">
              {t("valueEditor.jsonErrorLocation", {
                line: issue.line,
                column: issue.column,
              })}
            </span>
          </div>
          <div className="break-words opacity-90">{issue.message}</div>
          <pre className="max-h-24 overflow-auto rounded border border-destructive/20 bg-background/80 px-2 py-1 font-mono text-[11px] leading-4 text-foreground">
            <span className="text-muted-foreground">{gutter}</span>
            <span>{issue.lineText || " "}</span>
            {"\n"}
            <span className="text-destructive">{pointer}</span>
          </pre>
        </div>
      </div>
    </div>
  );
}
