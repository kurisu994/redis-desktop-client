"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tab,
  Tabs,
} from "@heroui/react";
import { useConnectionStore, type ConnectionConfig } from "@/stores/connection-store";
import { saveConnection, testConnection, listConnections } from "@/lib/tauri-api";

/** 测试结果状态 */
interface TestState {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
}

/** 新建/编辑连接对话框 */
export function ConnectionDialog() {
  const { t } = useTranslation();
  const { isDialogOpen, editingConnection, closeDialog, setConnections } =
    useConnectionStore();

  const isEditing = !!editingConnection;

  // 表单状态
  const [name, setName] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("6379");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [db, setDb] = useState("0");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [saving, setSaving] = useState(false);

  /** 对话框打开时初始化表单 */
  useEffect(() => {
    if (!isDialogOpen) return;
    setTestState({ status: "idle" });
    setSaving(false);
    setIsPasswordVisible(false);
    if (editingConnection) {
      setName(editingConnection.name);
      setHost(editingConnection.host);
      setPort(String(editingConnection.port));
      setUsername(editingConnection.username || "");
      setPassword(editingConnection.password || "");
      setDb(String(editingConnection.db));
    } else {
      setName("");
      setHost("127.0.0.1");
      setPort("6379");
      setUsername("");
      setPassword("");
      setDb("0");
    }
  }, [isDialogOpen, editingConnection]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeDialog();
    },
    [closeDialog]
  );

  /** 测试连接 */
  const handleTest = useCallback(async () => {
    setTestState({ status: "testing" });
    try {
      const result = await testConnection(
        host,
        parseInt(port, 10),
        username || undefined,
        password || undefined,
        parseInt(db, 10)
      );
      if (result.success) {
        setTestState({
          status: "success",
          message: t("connection.latency", { ms: result.latency_ms }),
        });
      } else {
        setTestState({ status: "error", message: result.message });
      }
    } catch (err) {
      setTestState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [host, port, username, password, db, t]);

  /** 保存连接配置 */
  const handleSave = useCallback(
    async () => {
      setSaving(true);
      try {
        const config: ConnectionConfig = {
          id: editingConnection?.id || crypto.randomUUID(),
          name: name,
          host,
          port: parseInt(port, 10),
          username: username || undefined,
          password: password || undefined,
          db: parseInt(db, 10),
        };

        await saveConnection(config);
        const updated = await listConnections();
        setConnections(updated);
        closeDialog();
      } catch (err) {
        console.error("保存连接失败:", err);
      } finally {
        setSaving(false);
      }
    },
    [name, host, port, username, password, db, editingConnection, closeDialog, setConnections]
  );

  return (
    <Modal
      isOpen={isDialogOpen}
      onOpenChange={handleOpenChange}
      size="lg"
      placement="center"
    >
      <ModalContent>
        <ModalHeader>
          {isEditing ? t("connection.edit") : t("connection.new")}
        </ModalHeader>
        <ModalBody>
          <Tabs aria-label="connection-tabs" color="primary" variant="underlined">
            <Tab key="general" title={t("connection.general")}>
              <div className="flex flex-col gap-4 pt-2">
                <Input
                  label={t("connection.name")}
                  placeholder={t("connection.namePlaceholder")}
                  value={name}
                  onValueChange={setName}
                  variant="bordered"
                />
                <div className="flex gap-3">
                  <Input
                    label={t("connection.host")}
                    value={host}
                    onValueChange={setHost}
                    variant="bordered"
                    isRequired
                    className="flex-[3]"
                  />
                  <Input
                    label={t("connection.port")}
                    value={port}
                    onValueChange={setPort}
                    variant="bordered"
                    isRequired
                    type="number"
                    className="flex-1"
                  />
                </div>
                <Input
                  label={t("connection.username")}
                  value={username}
                  onValueChange={setUsername}
                  variant="bordered"
                />
                <Input
                  label={t("connection.password")}
                  value={password}
                  onValueChange={setPassword}
                  variant="bordered"
                  type={isPasswordVisible ? "text" : "password"}
                  endContent={
                    <button
                      type="button"
                      className="focus:outline-none text-default-400 hover:text-default-600"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      aria-label={isPasswordVisible ? "隐藏密码" : "显示密码"}
                    >
                      {isPasswordVisible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  }
                />
              </div>
            </Tab>
            <Tab key="ssh" title={t("connection.sshTunnel")}>
              <div className="flex items-center justify-center h-32 text-default-400 text-sm">
                {t("connection.sshComingSoon")}
              </div>
            </Tab>
            <Tab key="advanced" title={t("connection.advanced")}>
              <div className="flex items-center justify-center h-32 text-default-400 text-sm">
                {t("connection.advancedComingSoon")}
              </div>
            </Tab>
          </Tabs>

          {/* 测试结果提示 */}
          {testState.status !== "idle" && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                testState.status === "testing"
                  ? "bg-default-100 text-default-500"
                  : testState.status === "success"
                    ? "bg-success-50 text-success-600"
                    : "bg-danger-50 text-danger-600"
              }`}
            >
              {testState.status === "testing"
                ? t("connection.testing")
                : testState.status === "success"
                  ? `✓ ${t("connection.testSuccess")} — ${testState.message}`
                  : `✗ ${t("connection.testFailed")}: ${testState.message}`}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={handleTest}
            isLoading={testState.status === "testing"}
          >
            {t("connection.test")}
          </Button>
          <div className="flex-1" />
          <Button variant="flat" onPress={closeDialog}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={() => handleSave()}
            isLoading={saving}
          >
            {t("actions.save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
