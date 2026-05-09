"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getStreamValue,
  addStreamEntry,
  deleteStreamEntry,
} from "@/lib/tauri-api";
import { TableView, RowActions, TruncatedValue } from "./table-view";
import { AddFieldDialog } from "./add-field-dialog";
import { useLoadEffect, DEFAULT_TABLE_PAGE_SIZE } from "./value-viewer";

// ============ Stream 查看器 ============

/** Stream 类型值查看/编辑器 */
export function StreamViewer({
  keyName,
  totalCount,
  onValueChanged,
}: {
  keyName: string;
  totalCount: number;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [entries, setEntries] = useState<
    { id: string; fields: [string, string][] }[]
  >([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  /** ID 边界历史，每项为 [startId, endId]，用于前后翻页 */
  const [idHistory, setIdHistory] = useState<string[]>(["-"]);

  const loadPage = useCallback(
    async (startId: string) => {
      if (!connectionId) return;
      const result = await getStreamValue(
        connectionId,
        selectedDb,
        keyName,
        startId,
        "+",
        pageSize,
      );
      setEntries(result);
      return result;
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    setPage(0);
    setIdHistory(["-"]);
    const result = await getStreamValue(
      connectionId,
      selectedDb,
      keyName,
      "-",
      "+",
      pageSize,
    );
    setEntries(result);
    // 记录下一页的起始 ID（最后一条的 ID + 1 毫秒时间戳的后缀）
    if (result.length === pageSize && result.length > 0) {
      const lastId = result[result.length - 1].id;
      // Stream ID 格式: timestamp-seq，用 "(" 前缀表示排除当前 ID
      const nextStartId = "(" + lastId;
      setIdHistory(["-", nextStartId]);
    }
  }, [connectionId, selectedDb, keyName, pageSize]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      const startId = idHistory[newPage] ?? "-";
      const result = await loadPage(startId);
      setPage(newPage);
      setExpandedRow(null);
      if (
        result &&
        result.length === pageSize &&
        result.length > 0 &&
        idHistory.length <= newPage + 1
      ) {
        const lastId = result[result.length - 1].id;
        const nextStartId = "(" + lastId;
        setIdHistory((prev) => [...prev, nextStartId]);
      }
    },
    [idHistory, loadPage, pageSize],
  );

  const handleDelete = async (entryId: string) => {
    if (!connectionId) return;
    await deleteStreamEntry(connectionId, selectedDb, keyName, entryId);
    loadData();
    onValueChanged();
  };

  /** 将 Stream entry 的 fields 格式化为字符串 */
  const formatFields = (fields: [string, string][]) =>
    fields.map(([k, v]) => `${k}: ${v}`).join(", ");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.streamId"), t("valueEditor.streamFields"), ""]}
        rows={entries.map((e, idx) => [
          <span key="id" className="text-primary font-medium text-xs">
            {e.id}
          </span>,
          <TruncatedValue
            key="f"
            value={formatFields(e.fields)}
            expanded={expandedRow === idx}
          />,
          <RowActions key="a" onDelete={() => handleDelete(e.id)} />,
        ])}
        widths={["w-44", "", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        addLabel={t("valueEditor.addEntry")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {showAdd && (
        <AddFieldDialog
          isOpen={showAdd}
          mode="stream"
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            if (!connectionId) return;
            const fields: [string, string][] = [
              [data.field || "data", data.value],
            ];
            await addStreamEntry(connectionId, selectedDb, keyName, fields);
            setShowAdd(false);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}
