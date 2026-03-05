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
  Switch,
  Select,
  SelectItem,
} from "@heroui/react";
import { Shield, Plus, Trash2 } from "lucide-react";
import {
  useConnectionStore,
  type ConnectionConfig,
  type ConnectionType,
  type SshConfig,
  type TlsConfig,
} from "@/stores/connection-store";
import { saveConnection, testConnection, listConnections } from "@/lib/tauri-api";

/** 测试结果状态 */
interface TestState {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
}

/** 默认 SSH 配置 */
const defaultSsh: SshConfig = {
  enabled: false,
  host: "",
  port: 22,
  username: "root",
  authType: "password",
  password: "",
  privateKeyPath: "",
  passphrase: "",
};

/** 默认 TLS 配置 */
const defaultTls: TlsConfig = {
  enabled: false,
  caCertPath: "",
  clientCertPath: "",
  clientKeyPath: "",
  skipVerify: false,
};

/** 新建/编辑连接对话框 */
export function ConnectionDialog() {
  const { t } = useTranslation();
  const { isDialogOpen, editingConnection, closeDialog, setConnections } =
    useConnectionStore();

  const isEditing = !!editingConnection;

  // 基本表单状态
  const [name, setName] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("6379");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [db, setDb] = useState("0");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [saving, setSaving] = useState(false);

  // 连接类型
  const [connectionType, setConnectionType] = useState<ConnectionType>("standalone");

  // SSH 配置
  const [ssh, setSsh] = useState<SshConfig>({ ...defaultSsh });

  // TLS 配置
  const [tls, setTls] = useState<TlsConfig>({ ...defaultTls });

  // Sentinel 配置
  const [sentinelNodes, setSentinelNodes] = useState<{ host: string; port: number }[]>([
    { host: "127.0.0.1", port: 26379 },
  ]);
  const [sentinelMaster, setSentinelMaster] = useState("mymaster");
  const [sentinelPassword, setSentinelPassword] = useState("");

  // Cluster 配置
  const [clusterNodes, setClusterNodes] = useState<{ host: string; port: number }[]>([
    { host: "127.0.0.1", port: 6379 },
  ]);

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
      setConnectionType(editingConnection.connectionType || "standalone");
      setSsh(editingConnection.ssh ? { ...editingConnection.ssh } : { ...defaultSsh });
      setTls(editingConnection.tls ? { ...editingConnection.tls } : { ...defaultTls });
      if (editingConnection.sentinel) {
        setSentinelNodes([...editingConnection.sentinel.nodes]);
        setSentinelMaster(editingConnection.sentinel.masterName);
        setSentinelPassword(editingConnection.sentinel.sentinelPassword || "");
      } else {
        setSentinelNodes([{ host: "127.0.0.1", port: 26379 }]);
        setSentinelMaster("mymaster");
        setSentinelPassword("");
      }
      if (editingConnection.cluster) {
        setClusterNodes([...editingConnection.cluster.nodes]);
      } else {
        setClusterNodes([{ host: "127.0.0.1", port: 6379 }]);
      }
    } else {
      setName("");
      setHost("127.0.0.1");
      setPort("6379");
      setUsername("");
      setPassword("");
      setDb("0");
      setConnectionType("standalone");
      setSsh({ ...defaultSsh });
      setTls({ ...defaultTls });
      setSentinelNodes([{ host: "127.0.0.1", port: 26379 }]);
      setSentinelMaster("mymaster");
      setSentinelPassword("");
      setClusterNodes([{ host: "127.0.0.1", port: 6379 }]);
    }
  }, [isDialogOpen, editingConnection]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeDialog();
    },
    [closeDialog]
  );

  /** 构建当前配置对象 */
  const buildConfig = useCallback((): ConnectionConfig => {
    const config: ConnectionConfig = {
      id: editingConnection?.id || crypto.randomUUID(),
      name,
      host,
      port: parseInt(port, 10),
      username: username || undefined,
      password: password || undefined,
      db: parseInt(db, 10),
      connectionType,
    };
    if (ssh.enabled) config.ssh = ssh;
    if (tls.enabled) config.tls = tls;
    if (connectionType === "sentinel") {
      config.sentinel = {
        nodes: sentinelNodes,
        masterName: sentinelMaster,
        sentinelPassword: sentinelPassword || undefined,
      };
    }
    if (connectionType === "cluster") {
      config.cluster = { nodes: clusterNodes };
    }
    return config;
  }, [
    editingConnection, name, host, port, username, password, db,
    connectionType, ssh, tls, sentinelNodes, sentinelMaster, sentinelPassword, clusterNodes,
  ]);

  /** 测试连接 */
  const handleTest = useCallback(async () => {
    setTestState({ status: "testing" });
    try {
      const result = await testConnection(buildConfig());
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
  }, [buildConfig, t]);

  /** 保存连接配置 */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveConnection(buildConfig());
      const updated = await listConnections();
      setConnections(updated);
      closeDialog();
    } catch (err) {
      console.error("保存连接失败:", err);
    } finally {
      setSaving(false);
    }
  }, [buildConfig, closeDialog, setConnections]);

  /** 更新 SSH 配置字段 */
  const updateSsh = (patch: Partial<SshConfig>) => setSsh((prev) => ({ ...prev, ...patch }));

  /** 更新 TLS 配置字段 */
  const updateTls = (patch: Partial<TlsConfig>) => setTls((prev) => ({ ...prev, ...patch }));

  return (
    <Modal
      isOpen={isDialogOpen}
      onOpenChange={handleOpenChange}
      size="2xl"
      placement="center"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          {isEditing ? t("connection.edit") : t("connection.new")}
        </ModalHeader>
        <ModalBody>
          <Tabs aria-label="connection-tabs" color="primary" variant="underlined">
            {/* ========== 常规 Tab ========== */}
            <Tab key="general" title={t("connection.general")}>
              <div className="flex flex-col gap-4 pt-2">
                <Input
                  label={t("connection.name")}
                  placeholder={t("connection.namePlaceholder")}
                  value={name}
                  onValueChange={setName}
                  variant="bordered"
                />
                {/* 连接类型选择 */}
                <Select
                  label={t("connection.connectionType")}
                  selectedKeys={[connectionType]}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0] as ConnectionType;
                    if (val) setConnectionType(val);
                  }}
                  variant="bordered"
                >
                  <SelectItem key="standalone">{t("connection.standalone")}</SelectItem>
                  <SelectItem key="sentinel">{t("connection.sentinelMode")}</SelectItem>
                  <SelectItem key="cluster">{t("connection.clusterMode")}</SelectItem>
                </Select>

                {/* Standalone 主机配置 */}
                {connectionType === "standalone" && (
                  <>
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
                    <PasswordInput
                      label={t("connection.password")}
                      value={password}
                      onValueChange={setPassword}
                      isVisible={isPasswordVisible}
                      onToggle={() => setIsPasswordVisible(!isPasswordVisible)}
                    />
                    <Input
                      label={t("connection.database")}
                      value={db}
                      onValueChange={setDb}
                      variant="bordered"
                      type="number"
                    />
                  </>
                )}

                {/* Sentinel 配置 */}
                {connectionType === "sentinel" && (
                  <SentinelForm
                    nodes={sentinelNodes}
                    setNodes={setSentinelNodes}
                    masterName={sentinelMaster}
                    setMasterName={setSentinelMaster}
                    sentinelPassword={sentinelPassword}
                    setSentinelPassword={setSentinelPassword}
                    username={username}
                    setUsername={setUsername}
                    password={password}
                    setPassword={setPassword}
                    db={db}
                    setDb={setDb}
                    t={t}
                  />
                )}

                {/* Cluster 配置 */}
                {connectionType === "cluster" && (
                  <ClusterForm
                    nodes={clusterNodes}
                    setNodes={setClusterNodes}
                    username={username}
                    setUsername={setUsername}
                    password={password}
                    setPassword={setPassword}
                    t={t}
                  />
                )}
              </div>
            </Tab>

            {/* ========== SSH 隧道 Tab ========== */}
            <Tab key="ssh" title={t("connection.sshTunnel")}>
              <div className="flex flex-col gap-4 pt-2">
                <Switch
                  isSelected={ssh.enabled}
                  onValueChange={(v) => updateSsh({ enabled: v })}
                >
                  {t("connection.enableSsh")}
                </Switch>
                {ssh.enabled && (
                  <>
                    <div className="flex gap-3">
                      <Input
                        label={t("connection.sshHost")}
                        value={ssh.host}
                        onValueChange={(v) => updateSsh({ host: v })}
                        variant="bordered"
                        isRequired
                        className="flex-[3]"
                      />
                      <Input
                        label={t("connection.sshPort")}
                        value={String(ssh.port)}
                        onValueChange={(v) => updateSsh({ port: parseInt(v, 10) || 22 })}
                        variant="bordered"
                        type="number"
                        className="flex-1"
                      />
                    </div>
                    <Input
                      label={t("connection.sshUsername")}
                      value={ssh.username}
                      onValueChange={(v) => updateSsh({ username: v })}
                      variant="bordered"
                      isRequired
                    />
                    <Select
                      label={t("connection.sshAuthType")}
                      selectedKeys={[ssh.authType]}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0] as "password" | "privateKey";
                        if (val) updateSsh({ authType: val });
                      }}
                      variant="bordered"
                    >
                      <SelectItem key="password">{t("connection.sshPassword")}</SelectItem>
                      <SelectItem key="privateKey">{t("connection.sshPrivateKey")}</SelectItem>
                    </Select>
                    {ssh.authType === "password" ? (
                      <Input
                        label={t("connection.sshPassword")}
                        value={ssh.password || ""}
                        onValueChange={(v) => updateSsh({ password: v })}
                        variant="bordered"
                        type="password"
                      />
                    ) : (
                      <>
                        <Input
                          label={t("connection.sshKeyPath")}
                          value={ssh.privateKeyPath || ""}
                          onValueChange={(v) => updateSsh({ privateKeyPath: v })}
                          variant="bordered"
                          placeholder="~/.ssh/id_rsa"
                        />
                        <Input
                          label={t("connection.sshPassphrase")}
                          value={ssh.passphrase || ""}
                          onValueChange={(v) => updateSsh({ passphrase: v })}
                          variant="bordered"
                          type="password"
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </Tab>

            {/* ========== SSL/TLS Tab ========== */}
            <Tab
              key="tls"
              title={
                <div className="flex items-center gap-1">
                  <Shield size={14} />
                  <span>SSL/TLS</span>
                </div>
              }
            >
              <div className="flex flex-col gap-4 pt-2">
                <Switch
                  isSelected={tls.enabled}
                  onValueChange={(v) => updateTls({ enabled: v })}
                >
                  {t("connection.enableTls")}
                </Switch>
                {tls.enabled && (
                  <>
                    <Input
                      label={t("connection.tlsCaCert")}
                      value={tls.caCertPath || ""}
                      onValueChange={(v) => updateTls({ caCertPath: v })}
                      variant="bordered"
                      placeholder="/path/to/ca.crt"
                    />
                    <Input
                      label={t("connection.tlsClientCert")}
                      value={tls.clientCertPath || ""}
                      onValueChange={(v) => updateTls({ clientCertPath: v })}
                      variant="bordered"
                      placeholder="/path/to/client.crt"
                    />
                    <Input
                      label={t("connection.tlsClientKey")}
                      value={tls.clientKeyPath || ""}
                      onValueChange={(v) => updateTls({ clientKeyPath: v })}
                      variant="bordered"
                      placeholder="/path/to/client.key"
                    />
                    <Switch
                      isSelected={tls.skipVerify || false}
                      onValueChange={(v) => updateTls({ skipVerify: v })}
                      size="sm"
                      color="warning"
                    >
                      <span className="text-sm text-warning">
                        {t("connection.tlsSkipVerify")}
                      </span>
                    </Switch>
                  </>
                )}
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

/** 密码输入框（带显隐切换） */
function PasswordInput({
  label,
  value,
  onValueChange,
  isVisible,
  onToggle,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <Input
      label={label}
      value={value}
      onValueChange={onValueChange}
      variant="bordered"
      type={isVisible ? "text" : "password"}
      endContent={
        <button
          type="button"
          className="focus:outline-none text-default-400 hover:text-default-600"
          onClick={onToggle}
          aria-label={isVisible ? "隐藏密码" : "显示密码"}
        >
          {isVisible ? (
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
  );
}

/** Sentinel 节点配置表单 */
function SentinelForm({
  nodes,
  setNodes,
  masterName,
  setMasterName,
  sentinelPassword,
  setSentinelPassword,
  username,
  setUsername,
  password,
  setPassword,
  db,
  setDb,
  t,
}: {
  nodes: { host: string; port: number }[];
  setNodes: (nodes: { host: string; port: number }[]) => void;
  masterName: string;
  setMasterName: (v: string) => void;
  sentinelPassword: string;
  setSentinelPassword: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  db: string;
  setDb: (v: string) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <Input
        label={t("connection.sentinelMaster")}
        value={masterName}
        onValueChange={setMasterName}
        variant="bordered"
        isRequired
      />
      <div className="text-sm text-default-500 font-medium">{t("connection.sentinelNodes")}</div>
      {nodes.map((node, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            size="sm"
            value={node.host}
            onValueChange={(v) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], host: v };
              setNodes(copy);
            }}
            variant="bordered"
            className="flex-[3]"
            placeholder="127.0.0.1"
          />
          <Input
            size="sm"
            value={String(node.port)}
            onValueChange={(v) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], port: parseInt(v, 10) || 26379 };
              setNodes(copy);
            }}
            variant="bordered"
            type="number"
            className="flex-1"
            placeholder="26379"
          />
          {nodes.length > 1 && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="danger"
              onPress={() => setNodes(nodes.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="flat"
        startContent={<Plus size={14} />}
        onPress={() => setNodes([...nodes, { host: "127.0.0.1", port: 26379 }])}
      >
        {t("connection.addNode")}
      </Button>
      <Input
        label={t("connection.sentinelPasswordLabel")}
        value={sentinelPassword}
        onValueChange={setSentinelPassword}
        variant="bordered"
        type="password"
      />
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
      <Input
        label={t("connection.database")}
        value={db}
        onValueChange={setDb}
        variant="bordered"
        type="number"
      />
    </>
  );
}

/** Cluster 节点配置表单 */
function ClusterForm({
  nodes,
  setNodes,
  username,
  setUsername,
  password,
  setPassword,
  t,
}: {
  nodes: { host: string; port: number }[];
  setNodes: (nodes: { host: string; port: number }[]) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="text-sm text-default-500 font-medium">{t("connection.clusterNodes")}</div>
      {nodes.map((node, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            size="sm"
            value={node.host}
            onValueChange={(v) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], host: v };
              setNodes(copy);
            }}
            variant="bordered"
            className="flex-[3]"
            placeholder="127.0.0.1"
          />
          <Input
            size="sm"
            value={String(node.port)}
            onValueChange={(v) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], port: parseInt(v, 10) || 6379 };
              setNodes(copy);
            }}
            variant="bordered"
            type="number"
            className="flex-1"
            placeholder="6379"
          />
          {nodes.length > 1 && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="danger"
              onPress={() => setNodes(nodes.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="flat"
        startContent={<Plus size={14} />}
        onPress={() => setNodes([...nodes, { host: "127.0.0.1", port: 6379 }])}
      >
        {t("connection.addNode")}
      </Button>
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
    </>
  );
}
