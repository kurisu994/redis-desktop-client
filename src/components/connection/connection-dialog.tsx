"use client";

import { useState, useCallback } from "react";
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
import { saveConnection, testConnection, connectRedis, listConnections } from "@/lib/tauri-api";

/** 测试结果状态 */
interface TestState {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
}

/** 新建/编辑连接对话框 */
export function ConnectionDialog() {
  const { t } = useTranslation();
  const { isDialogOpen, editingConnection, closeDialog, setConnections, setConnectionStatus } =
    useConnectionStore();

  const isEditing = !!editingConnection;

  // 表单状态
  const [name, setName] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("6379");
  const [username, setUsername] = useState("default");
  const [password, setPassword] = useState("");
  const [db, setDb] = useState("0");
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [saving, setSaving] = useState(false);

  /** 对话框打开时重置表单 */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && editingConnection) {
        setName(editingConnection.name);
        setHost(editingConnection.host);
        setPort(String(editingConnection.port));
        setUsername(editingConnection.username || "default");
        setPassword(editingConnection.password || "");
        setDb(String(editingConnection.db));
      } else if (open) {
        setName("");
        setHost("127.0.0.1");
        setPort("6379");
        setUsername("default");
        setPassword("");
        setDb("0");
      }
      setTestState({ status: "idle" });
      if (!open) closeDialog();
    },
    [editingConnection, closeDialog]
  );

  /** 测试连接 */
  const handleTest = useCallback(async () => {
    setTestState({ status: "testing" });
    try {
      const result = await testConnection(
        host,
        parseInt(port, 10),
        username !== "default" ? username : undefined,
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

  /** 保存并连接 */
  const handleSave = useCallback(
    async (shouldConnect: boolean) => {
      setSaving(true);
      try {
        const config: ConnectionConfig = {
          id: editingConnection?.id || crypto.randomUUID(),
          name: name || `${host}:${port}`,
          host,
          port: parseInt(port, 10),
          username: username !== "default" ? username : undefined,
          password: password || undefined,
          db: parseInt(db, 10),
        };

        await saveConnection(config);
        const updated = await listConnections();
        setConnections(updated);

        if (shouldConnect) {
          setConnectionStatus(config.id, "connecting");
          try {
            await connectRedis(config.id);
            setConnectionStatus(config.id, "connected");
          } catch {
            setConnectionStatus(config.id, "disconnected");
          }
        }
        closeDialog();
      } catch (err) {
        console.error("保存连接失败:", err);
      } finally {
        setSaving(false);
      }
    },
    [name, host, port, username, password, db, editingConnection, closeDialog, setConnections, setConnectionStatus]
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
                  type="password"
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
            onPress={() => handleSave(true)}
            isLoading={saving}
          >
            {t("connection.saveAndConnect")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
