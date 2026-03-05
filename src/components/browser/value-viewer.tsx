"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyInfo } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getStringValue,
  getHashValue,
  getListValue,
  getSetValue,
  getZsetValue,
  getStreamValue,
  setStringValue,
  setHashField,
  deleteHashField,
  addListElement,

  deleteListElement,
  addSetMember,
  deleteSetMember,
  addZsetMember,
  deleteZsetMember,
  addStreamEntry,
  deleteStreamEntry,
} from "@/lib/tauri-api";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Save } from "lucide-react";
import { AddFieldDialog } from "./add-field-dialog";
import Editor from "@monaco-editor/react";

/** 在 useEffect 中安全调用数据加载函数，避免 react-hooks/set-state-in-effect */
function useLoadEffect(loadFn: () => Promise<void>, deps: React.DependencyList) {
  const ref = useRef(loadFn);
  ref.current = loadFn;
  useEffect(() => {
    ref.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
import { useTheme } from "next-themes";

interface ValueViewerProps {
  keyName: string;
  keyInfo: KeyInfo;
  onValueChanged: () => void;
}

/** 值查看器 — 根据 Key 类型分发不同渲染 */
export function ValueViewer({ keyName, keyInfo, onValueChanged }: ValueViewerProps) {
  switch (keyInfo.key_type) {
    case "string":
      return (
        <StringViewer
          keyName={keyName}
          onValueChanged={onValueChanged}
        />
      );
    case "hash":
      return (
        <HashViewer
          keyName={keyName}
          onValueChanged={onValueChanged}
        />
      );
    case "list":
      return (
        <ListViewer
          keyName={keyName}
          onValueChanged={onValueChanged}
        />
      );
    case "set":
      return (
        <SetViewer
          keyName={keyName}
          onValueChanged={onValueChanged}
        />
      );
    case "zset":
      return (
        <ZSetViewer
          keyName={keyName}
          onValueChanged={onValueChanged}
        />
      );
    case "stream":
      return (
        <StreamViewer
          keyName={keyName}
          onValueChanged={onValueChanged}
        />
      );
    default:
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          不支持的数据类型: {keyInfo.key_type}
        </div>
      );
  }
}

// ============ String 查看器 ============

function StringViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const { theme } = useTheme();
  const [value, setValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [format, setFormat] = useState<"text" | "json">("text");

  useEffect(() => {
    if (!connectionId) return;
    getStringValue(connectionId, selectedDb, keyName)
      .then((v) => {
        setValue(v);
        setOriginalValue(v);
        // 自动检测 JSON
        try {
          JSON.parse(v);
          setFormat("json");
        } catch {
          setFormat("text");
        }
      })
      .catch(console.error);
  }, [connectionId, selectedDb, keyName]);

  const handleSave = async () => {
    if (!connectionId) return;
    await setStringValue(connectionId, selectedDb, keyName, value);
    setOriginalValue(value);
    onValueChanged();
  };

  const isDirty = value !== originalValue;
  const language = format === "json" ? "json" : "plaintext";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 格式切换栏 */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-b border-border text-xs font-medium">
        {(["text", "json"] as const).map((f) => (
          <button
            key={f}
            className={`transition-colors ${
              format === f ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setFormat(f)}
          >
            {t(`valueEditor.${f}`)}
          </button>
        ))}
        <div className="flex-1" />
        {isDirty && (
          <Button
            size="sm"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" />
            {t("actions.save")}
          </Button>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          language={language}
          value={value}
          onChange={(v) => setValue(v || "")}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

// ============ Hash 查看器 ============

function HashViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [fields, setFields] = useState<{ field: string; value: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState<{ field: string; value: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    const result = await getHashValue(connectionId, selectedDb, keyName, 0, "*", 500);
    setFields(result.fields);
  }, [connectionId, selectedDb, keyName]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName]);

  const handleDelete = async (field: string) => {
    if (!connectionId) return;
    await deleteHashField(connectionId, selectedDb, keyName, field);
    loadData();
    onValueChanged();
  };

  /** 保存（新增或编辑）*/
  const handleSave = async (data: { field?: string; value: string }) => {
    if (!connectionId) return;
    await setHashField(connectionId, selectedDb, keyName, data.field!, data.value);
    setShowAdd(false);
    setEditData(null);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.field"), t("valueEditor.value"), ""]}
        rows={fields.map((f) => [
          <span key="f" className="text-primary font-medium">{f.field}</span>,
          <span key="v" className="break-all text-foreground/80">{f.value}</span>,
          <RowActions
            key="a"
            onEdit={() => setEditData(f)}
            onDelete={() => handleDelete(f.field)}
          />,
        ])}
        widths={["w-1/3", "", "w-20"]}
        onRowClick={(idx) => setEditData(fields[idx])}
        addLabel={t("valueEditor.addField")}
        onAdd={() => setShowAdd(true)}
      />
      {(showAdd || editData) && (
        <AddFieldDialog
          isOpen={showAdd || !!editData}
          mode="hash"
          initialData={editData ? { field: editData.field, value: editData.value } : undefined}
          onClose={() => { setShowAdd(false); setEditData(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ============ List 查看器 ============

function ListViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [items, setItems] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    const result = await getListValue(connectionId, selectedDb, keyName, 0, -1);
    setItems(result);
  }, [connectionId, selectedDb, keyName]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName]);

  const handleDelete = async (index: number) => {
    if (!connectionId) return;
    await deleteListElement(connectionId, selectedDb, keyName, index);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.index"), t("valueEditor.value"), ""]}
        rows={items.map((item, i) => [
          <span key="i" className="text-primary font-medium">{i}</span>,
          <span key="v" className="break-all text-foreground/80">{item}</span>,
          <RowActions key="a" onEdit={() => setEditIdx(i)} onDelete={() => handleDelete(i)} />,
        ])}
        widths={["w-20", "", "w-20"]}
        onRowClick={(idx) => setEditIdx(idx)}
        addLabel={t("valueEditor.addElement")}
        onAdd={() => setShowAdd(true)}
      />
      {(showAdd || editIdx !== null) && (
        <AddFieldDialog
          isOpen={showAdd || editIdx !== null}
          mode="list"
          initialData={editIdx !== null ? { value: items[editIdx] } : undefined}
          onClose={() => { setShowAdd(false); setEditIdx(null); }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editIdx !== null) {
              // 编辑：先删再加（List 无原生 SET by index 的封装，用 delete + add）
              await deleteListElement(connectionId, selectedDb, keyName, editIdx);
              await addListElement(connectionId, selectedDb, keyName, data.value, "tail");
            } else {
              await addListElement(
                connectionId,
                selectedDb,
                keyName,
                data.value,
                data.position || "tail"
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

// ============ Set 查看器 ============

function SetViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [members, setMembers] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    const result = await getSetValue(connectionId, selectedDb, keyName, 0, "*", 500);
    setMembers(result.members);
  }, [connectionId, selectedDb, keyName]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName]);

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
        rows={members.map((m) => [
          <span key="m" className="break-all text-foreground/80">{m}</span>,
          <RowActions key="a" onEdit={() => setEditMember(m)} onDelete={() => handleDelete(m)} />,
        ])}
        widths={["", "w-20"]}
        onRowClick={(idx) => setEditMember(members[idx])}
        addLabel={t("valueEditor.addMember")}
        onAdd={() => setShowAdd(true)}
      />
      {(showAdd || editMember !== null) && (
        <AddFieldDialog
          isOpen={showAdd || editMember !== null}
          mode="set"
          initialData={editMember !== null ? { value: editMember } : undefined}
          onClose={() => { setShowAdd(false); setEditMember(null); }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editMember !== null) {
              await deleteSetMember(connectionId, selectedDb, keyName, editMember);
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

// ============ ZSet 查看器 ============

function ZSetViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [members, setMembers] = useState<{ member: string; score: number }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState<{ member: string; score: number } | null>(null);

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    const result = await getZsetValue(connectionId, selectedDb, keyName, 0, -1);
    setMembers(result);
  }, [connectionId, selectedDb, keyName]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName]);

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
        rows={members.map((m) => [
          <span key="s" className="text-primary font-medium">{m.score}</span>,
          <span key="m" className="break-all text-foreground/80">{m.member}</span>,
          <RowActions key="a" onEdit={() => setEditData(m)} onDelete={() => handleDelete(m.member)} />,
        ])}
        widths={["w-28", "", "w-20"]}
        onRowClick={(idx) => setEditData(members[idx])}
        addLabel={t("valueEditor.addMember")}
        onAdd={() => setShowAdd(true)}
      />
      {(showAdd || editData) && (
        <AddFieldDialog
          isOpen={showAdd || !!editData}
          mode="zset"
          initialData={editData ? { value: editData.member, score: editData.score } : undefined}
          onClose={() => { setShowAdd(false); setEditData(null); }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editData) {
              await deleteZsetMember(connectionId, selectedDb, keyName, editData.member);
            }
            await addZsetMember(
              connectionId,
              selectedDb,
              keyName,
              data.value,
              data.score ?? 0
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

// ============ Stream 查看器 ============

function StreamViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [entries, setEntries] = useState<
    { id: string; fields: [string, string][] }[]
  >([]);
  const [showAdd, setShowAdd] = useState(false);

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    const result = await getStreamValue(
      connectionId,
      selectedDb,
      keyName,
      "",
      "",
      100
    );
    setEntries(result);
  }, [connectionId, selectedDb, keyName]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName]);

  const handleDelete = async (entryId: string) => {
    if (!connectionId) return;
    await deleteStreamEntry(connectionId, selectedDb, keyName, entryId);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.streamId"), t("valueEditor.streamFields"), ""]}
        rows={entries.map((e) => [
          <span key="id" className="text-primary font-medium text-xs">{e.id}</span>,
          <div key="f" className="space-y-0.5">
            {e.fields.map(([k, v], i) => (
              <span key={i} className="text-xs text-foreground/80">
                <span className="text-primary">{k}</span>: {v}
                {i < e.fields.length - 1 && ", "}
              </span>
            ))}
          </div>,
          <RowActions key="a" onDelete={() => handleDelete(e.id)} />,
        ])}
        widths={["w-44", "", "w-20"]}
        addLabel={t("valueEditor.addEntry")}
        onAdd={() => setShowAdd(true)}
      />
      {showAdd && (
        <AddFieldDialog
          isOpen={showAdd}
          mode="stream"
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            if (!connectionId) return;
            const fields: [string, string][] = [[data.field || "data", data.value]];
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

// ============ 通用表格组件 ============

function TableView({
  headers,
  rows,
  widths,
  onRowClick,
  addLabel,
  onAdd,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  widths: string[];
  onRowClick?: (rowIdx: number) => void;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase font-medium tracking-wider bg-muted/50 text-muted-foreground sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 border-b border-border ${widths[i] || ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-[13px]">
            {rows.map((cells, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-border/50 hover:bg-muted/30 group ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(rowIdx)}
              >
                {cells.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* 添加按钮在表格内部底部 */}
        <div className="px-4 py-2.5 border-t border-border/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium px-1 py-1 rounded hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 行操作按钮 */
function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-muted-foreground hover:text-primary p-1"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-red-400 p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
