"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getListValue,
  addListElement,
  deleteListElement,
} from "@/lib/tauri-api";
import { TableView, RowActions, TruncatedValue } from "./table-view";
import { AddFieldDialog } from "./add-field-dialog";
import { useLoadEffect, DEFAULT_TABLE_PAGE_SIZE } from "./value-viewer";

// ============ List 查看器 ============

/** List 类型值查看/编辑器 */
export function ListViewer({
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
  const [items, setItems] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const loadPage = useCallback(
    async (p: number) => {
      if (!connectionId) return;
      const start = p * pageSize;
      const stop = start + pageSize - 1;
      const result = await getListValue(
        connectionId,
        selectedDb,
        keyName,
        start,
        stop,
      );
      setItems(result);
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    setPage(0);
    await loadPage(0);
  }, [loadPage]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      await loadPage(newPage);
      setPage(newPage);
      setExpandedRow(null);
    },
    [loadPage],
  );

  /** 当前页中元素的真实索引偏移 */
  const indexOffset = page * pageSize;

  const handleDelete = async (index: number) => {
    if (!connectionId) return;
    await deleteListElement(
      connectionId,
      selectedDb,
      keyName,
      indexOffset + index,
    );
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.index"), t("valueEditor.value"), ""]}
        rows={items.map((item, i) => [
          <span key="i" className="text-primary font-medium">
            {indexOffset + i}
          </span>,
          <TruncatedValue key="v" value={item} expanded={expandedRow === i} />,
          <RowActions key="a" onDelete={() => handleDelete(i)} />,
        ])}
        widths={["w-20", "", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditIdx(idx)}
        addLabel={t("valueEditor.addElement")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editIdx !== null) && (
        <AddFieldDialog
          isOpen={showAdd || editIdx !== null}
          mode="list"
          initialData={editIdx !== null ? { value: items[editIdx] } : undefined}
          onClose={() => {
            setShowAdd(false);
            setEditIdx(null);
          }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editIdx !== null) {
              // 编辑：先删再加（List 无原生 SET by index 的封装，用 delete + add）
              await deleteListElement(
                connectionId,
                selectedDb,
                keyName,
                indexOffset + editIdx,
              );
              await addListElement(
                connectionId,
                selectedDb,
                keyName,
                data.value,
                "tail",
              );
            } else {
              await addListElement(
                connectionId,
                selectedDb,
                keyName,
                data.value,
                data.position || "tail",
              );
            }
            setShowAdd(false);
            setEditIdx(null);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}
