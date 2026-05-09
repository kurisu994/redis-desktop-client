"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getHashValue,
  setHashField,
  deleteHashField,
} from "@/lib/tauri-api";
import { TableView, RowActions, TruncatedValue } from "./table-view";
import { AddFieldDialog } from "./add-field-dialog";
import { useLoadEffect, DEFAULT_TABLE_PAGE_SIZE } from "./value-viewer";

// ============ Hash 查看器 ============

/** Hash 类型值查看/编辑器 */
export function HashViewer({
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
  const [fields, setFields] = useState<{ field: string; value: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState<{
    field: string;
    value: string;
  } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  /** 每页对应的 HSCAN 游标历史，用于前后翻页 */
  const [cursorHistory, setCursorHistory] = useState<number[]>([0]);

  const loadPage = useCallback(
    async (cursor: number) => {
      if (!connectionId) return;
      const result = await getHashValue(
        connectionId,
        selectedDb,
        keyName,
        cursor,
        "*",
        pageSize,
      );
      setFields(result.fields);
      return result.cursor;
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  /** 初始加载第一页 */
  const loadData = useCallback(async () => {
    if (!connectionId) return;
    setPage(0);
    setCursorHistory([0]);
    const result = await getHashValue(
      connectionId,
      selectedDb,
      keyName,
      0,
      "*",
      pageSize,
    );
    setFields(result.fields);
    // 记录下一页的游标
    if (result.cursor !== 0) {
      setCursorHistory([0, result.cursor]);
    }
  }, [connectionId, selectedDb, keyName, pageSize]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  /** 翻页 */
  const handlePageChange = useCallback(
    async (newPage: number) => {
      const cursor = cursorHistory[newPage] ?? 0;
      const nextCursor = await loadPage(cursor);
      setPage(newPage);
      setExpandedRow(null);
      // 记录下一页游标
      if (
        nextCursor != null &&
        nextCursor !== 0 &&
        cursorHistory.length <= newPage + 1
      ) {
        setCursorHistory((prev) => [...prev, nextCursor]);
      }
    },
    [cursorHistory, loadPage],
  );

  const handleDelete = async (field: string) => {
    if (!connectionId) return;
    await deleteHashField(connectionId, selectedDb, keyName, field);
    loadData();
    onValueChanged();
  };

  /** 保存（新增或编辑，支持 field 改名）*/
  const handleSave = async (data: {
    field?: string;
    oldField?: string;
    value: string;
  }) => {
    if (!connectionId) return;
    // 如果 field 改名了，先删旧 field 再建新 field
    if (data.oldField && data.oldField !== data.field) {
      await deleteHashField(connectionId, selectedDb, keyName, data.oldField);
    }
    await setHashField(
      connectionId,
      selectedDb,
      keyName,
      data.field!,
      data.value,
    );
    setShowAdd(false);
    setEditData(null);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.field"), t("valueEditor.value"), ""]}
        rows={fields.map((f, idx) => [
          <span key="f" className="text-primary font-medium">
            {f.field}
          </span>,
          <TruncatedValue
            key="v"
            value={f.value}
            expanded={expandedRow === idx}
          />,
          <RowActions key="a" onDelete={() => handleDelete(f.field)} />,
        ])}
        widths={["w-1/3", "w-1/2", "w-12"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditData(fields[idx])}
        addLabel={t("valueEditor.addField")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editData) && (
        <AddFieldDialog
          isOpen={showAdd || !!editData}
          mode="hash"
          initialData={
            editData
              ? { field: editData.field, value: editData.value }
              : undefined
          }
          onClose={() => {
            setShowAdd(false);
            setEditData(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
