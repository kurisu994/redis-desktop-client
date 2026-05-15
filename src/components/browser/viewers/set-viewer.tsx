"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import { getSetValue, addSetMember, deleteSetMember } from "@/lib/tauri-api";
import { TableView, RowActions, TruncatedValue } from "./table-view";
import { AddFieldDialog } from "./add-field-dialog";
import { useLoadEffect, DEFAULT_TABLE_PAGE_SIZE } from "./value-viewer";

// ============ Set 查看器 ============

/** Set 类型值查看/编辑器 */
export function SetViewer({
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
  const [members, setMembers] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [cursorHistory, setCursorHistory] = useState<number[]>([0]);

  const loadPage = useCallback(
    async (cursor: number) => {
      if (!connectionId) return;
      const result = await getSetValue(
        connectionId,
        selectedDb,
        keyName,
        cursor,
        "*",
        pageSize,
      );
      setMembers(result.members);
      return result.cursor;
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    setPage(0);
    setCursorHistory([0]);
    const result = await getSetValue(
      connectionId,
      selectedDb,
      keyName,
      0,
      "*",
      pageSize,
    );
    setMembers(result.members);
    if (result.cursor !== 0) {
      setCursorHistory([0, result.cursor]);
    }
  }, [connectionId, selectedDb, keyName, pageSize]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      const cursor = cursorHistory[newPage] ?? 0;
      const nextCursor = await loadPage(cursor);
      setPage(newPage);
      setExpandedRow(null);
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

  const handleDelete = async (member: string) => {
    if (!connectionId) return;
    await deleteSetMember(connectionId, selectedDb, keyName, member);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.member"), ""]}
        rows={members.map((m, idx) => [
          <TruncatedValue key="m" value={m} expanded={expandedRow === idx} />,
          <RowActions key="a" onDelete={() => handleDelete(m)} />,
        ])}
        widths={["", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditMember(members[idx])}
        addLabel={t("valueEditor.addMember")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editMember !== null) && (
        <AddFieldDialog
          isOpen={showAdd || editMember !== null}
          mode="set"
          initialData={editMember !== null ? { value: editMember } : undefined}
          onClose={() => {
            setShowAdd(false);
            setEditMember(null);
          }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editMember !== null) {
              await deleteSetMember(
                connectionId,
                selectedDb,
                keyName,
                editMember,
              );
            }
            await addSetMember(connectionId, selectedDb, keyName, data.value);
            setShowAdd(false);
            setEditMember(null);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}
