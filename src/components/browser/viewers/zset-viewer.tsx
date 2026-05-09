"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getZsetValue,
  addZsetMember,
  deleteZsetMember,
} from "@/lib/tauri-api";
import { TableView, RowActions, TruncatedValue } from "./table-view";
import { AddFieldDialog } from "./add-field-dialog";
import { useLoadEffect, DEFAULT_TABLE_PAGE_SIZE } from "./value-viewer";

// ============ ZSet 查看器 ============

/** ZSet（有序集合）类型值查看/编辑器 */
export function ZSetViewer({
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
  const [members, setMembers] = useState<{ member: string; score: number }[]>(
    [],
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState<{
    member: string;
    score: number;
  } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const loadPage = useCallback(
    async (p: number) => {
      if (!connectionId) return;
      const start = p * pageSize;
      const stop = start + pageSize - 1;
      const result = await getZsetValue(
        connectionId,
        selectedDb,
        keyName,
        start,
        stop,
      );
      setMembers(result);
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

  const handleDelete = async (member: string) => {
    if (!connectionId) return;
    await deleteZsetMember(connectionId, selectedDb, keyName, member);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.score"), t("valueEditor.member"), ""]}
        rows={members.map((m, idx) => [
          <span key="s" className="text-primary font-medium">
            {m.score}
          </span>,
          <TruncatedValue
            key="m"
            value={m.member}
            expanded={expandedRow === idx}
          />,
          <RowActions key="a" onDelete={() => handleDelete(m.member)} />,
        ])}
        widths={["w-28", "", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditData(members[idx])}
        addLabel={t("valueEditor.addMember")}
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
          mode="zset"
          initialData={
            editData
              ? { value: editData.member, score: editData.score }
              : undefined
          }
          onClose={() => {
            setShowAdd(false);
            setEditData(null);
          }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editData) {
              await deleteZsetMember(
                connectionId,
                selectedDb,
                keyName,
                editData.member,
              );
            }
            await addZsetMember(
              connectionId,
              selectedDb,
              keyName,
              data.value,
              data.score ?? 0,
            );
            setShowAdd(false);
            setEditData(null);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}
