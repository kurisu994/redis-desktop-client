"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Shield, Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
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
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("connection.edit") : t("connection.new")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="general">
            <TabsList variant="line">
              <TabsTrigger value="general">{t("connection.general")}</TabsTrigger>
              <TabsTrigger value="ssh">{t("connection.sshTunnel")}</TabsTrigger>
              <TabsTrigger value="tls">
                <Shield size={14} />
                <span>SSL/TLS</span>
              </TabsTrigger>
            </TabsList>

            {/* ========== 常规 Tab ========== */}
            <TabsContent value="general">
              <div className="flex flex-col gap-4 pt-2">
                <div className="space-y-2">
                  <Label>{t("connection.name")}</Label>
                  <Input
                    placeholder={t("connection.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                {/* 连接类型选择 */}
                <div className="space-y-2">
                  <Label>{t("connection.connectionType")}</Label>
                  <Select
                    value={connectionType}
                    onValueChange={(val) => setConnectionType(val as ConnectionType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">{t("connection.standalone")}</SelectItem>
                      <SelectItem value="sentinel">{t("connection.sentinelMode")}</SelectItem>
                      <SelectItem value="cluster">{t("connection.clusterMode")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Standalone 主机配置 */}
                {connectionType === "standalone" && (
                  <>
                    <div className="flex gap-3">
                      <div className="space-y-2 flex-[3]">
                        <Label>{t("connection.host")}</Label>
                        <Input
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label>{t("connection.port")}</Label>
                        <Input
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          required
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("connection.username")}</Label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <PasswordInput
                      label={t("connection.password")}
                      value={password}
                      onValueChange={setPassword}
                      isVisible={isPasswordVisible}
                      onToggle={() => setIsPasswordVisible(!isPasswordVisible)}
                    />
                    <div className="space-y-2">
                      <Label>{t("connection.database")}</Label>
                      <Input
                        value={db}
                        onChange={(e) => setDb(e.target.value)}
                        type="number"
                      />
                    </div>
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
            </TabsContent>

            {/* ========== SSH 隧道 Tab ========== */}
            <TabsContent value="ssh">
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="ssh-enable"
                    checked={ssh.enabled}
                    onCheckedChange={(v) => updateSsh({ enabled: v })}
                  />
                  <Label htmlFor="ssh-enable">{t("connection.enableSsh")}</Label>
                </div>
                {ssh.enabled && (
                  <>
                    <div className="flex gap-3">
                      <div className="space-y-2 flex-[3]">
                        <Label>{t("connection.sshHost")}</Label>
                        <Input
                          value={ssh.host}
                          onChange={(e) => updateSsh({ host: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label>{t("connection.sshPort")}</Label>
                        <Input
                          value={String(ssh.port)}
                          onChange={(e) => updateSsh({ port: parseInt(e.target.value, 10) || 22 })}
                          type="number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("connection.sshUsername")}</Label>
                      <Input
                        value={ssh.username}
                        onChange={(e) => updateSsh({ username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("connection.sshAuthType")}</Label>
                      <Select
                        value={ssh.authType}
                        onValueChange={(val) => updateSsh({ authType: val as "password" | "privateKey" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="password">{t("connection.sshPassword")}</SelectItem>
                          <SelectItem value="privateKey">{t("connection.sshPrivateKey")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {ssh.authType === "password" ? (
                      <div className="space-y-2">
                        <Label>{t("connection.sshPassword")}</Label>
                        <Input
                          value={ssh.password || ""}
                          onChange={(e) => updateSsh({ password: e.target.value })}
                          type="password"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>{t("connection.sshKeyPath")}</Label>
                          <Input
                            value={ssh.privateKeyPath || ""}
                            onChange={(e) => updateSsh({ privateKeyPath: e.target.value })}
                            placeholder="~/.ssh/id_rsa"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("connection.sshPassphrase")}</Label>
                          <Input
                            value={ssh.passphrase || ""}
                            onChange={(e) => updateSsh({ passphrase: e.target.value })}
                            type="password"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* ========== SSL/TLS Tab ========== */}
            <TabsContent value="tls">
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="tls-enable"
                    checked={tls.enabled}
                    onCheckedChange={(v) => updateTls({ enabled: v })}
                  />
                  <Label htmlFor="tls-enable">{t("connection.enableTls")}</Label>
                </div>
                {tls.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("connection.tlsCaCert")}</Label>
                      <Input
                        value={tls.caCertPath || ""}
                        onChange={(e) => updateTls({ caCertPath: e.target.value })}
                        placeholder="/path/to/ca.crt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("connection.tlsClientCert")}</Label>
                      <Input
                        value={tls.clientCertPath || ""}
                        onChange={(e) => updateTls({ clientCertPath: e.target.value })}
                        placeholder="/path/to/client.crt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("connection.tlsClientKey")}</Label>
                      <Input
                        value={tls.clientKeyPath || ""}
                        onChange={(e) => updateTls({ clientKeyPath: e.target.value })}
                        placeholder="/path/to/client.key"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="tls-skip-verify"
                        size="sm"
                        checked={tls.skipVerify || false}
                        onCheckedChange={(v) => updateTls({ skipVerify: v })}
                      />
                      <Label htmlFor="tls-skip-verify" className="text-sm text-yellow-500">
                        {t("connection.tlsSkipVerify")}
                      </Label>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* 测试结果提示 */}
          {testState.status !== "idle" && (
            <div
              className={`text-sm px-3 py-2 rounded-lg mt-4 ${
                testState.status === "testing"
                  ? "bg-muted text-muted-foreground"
                  : testState.status === "success"
                    ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
              }`}
            >
              {testState.status === "testing"
                ? t("connection.testing")
                : testState.status === "success"
                  ? `✓ ${t("connection.testSuccess")} — ${testState.message}`
                  : `✗ ${t("connection.testFailed")}: ${testState.message}`}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={testState.status === "testing"}
          >
            {testState.status === "testing" && <Loader2 className="animate-spin" />}
            {t("connection.test")}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={closeDialog}>
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              {t("actions.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          type={isVisible ? "text" : "password"}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
          onClick={onToggle}
          aria-label={isVisible ? "隐藏密码" : "显示密码"}
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
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
      <div className="space-y-2">
        <Label>{t("connection.sentinelMaster")}</Label>
        <Input
          value={masterName}
          onChange={(e) => setMasterName(e.target.value)}
          required
        />
      </div>
      <div className="text-sm text-muted-foreground font-medium">{t("connection.sentinelNodes")}</div>
      {nodes.map((node, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={node.host}
            onChange={(e) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], host: e.target.value };
              setNodes(copy);
            }}
            className="flex-[3]"
            placeholder="127.0.0.1"
          />
          <Input
            value={String(node.port)}
            onChange={(e) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], port: parseInt(e.target.value, 10) || 26379 };
              setNodes(copy);
            }}
            type="number"
            className="flex-1"
            placeholder="26379"
          />
          {nodes.length > 1 && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setNodes(nodes.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setNodes([...nodes, { host: "127.0.0.1", port: 26379 }])}
      >
        <Plus size={14} />
        {t("connection.addNode")}
      </Button>
      <div className="space-y-2">
        <Label>{t("connection.sentinelPasswordLabel")}</Label>
        <Input
          value={sentinelPassword}
          onChange={(e) => setSentinelPassword(e.target.value)}
          type="password"
        />
      </div>
      <div className="space-y-2">
        <Label>{t("connection.username")}</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("connection.password")}</Label>
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
      </div>
      <div className="space-y-2">
        <Label>{t("connection.database")}</Label>
        <Input
          value={db}
          onChange={(e) => setDb(e.target.value)}
          type="number"
        />
      </div>
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
      <div className="text-sm text-muted-foreground font-medium">{t("connection.clusterNodes")}</div>
      {nodes.map((node, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={node.host}
            onChange={(e) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], host: e.target.value };
              setNodes(copy);
            }}
            className="flex-[3]"
            placeholder="127.0.0.1"
          />
          <Input
            value={String(node.port)}
            onChange={(e) => {
              const copy = [...nodes];
              copy[i] = { ...copy[i], port: parseInt(e.target.value, 10) || 6379 };
              setNodes(copy);
            }}
            type="number"
            className="flex-1"
            placeholder="6379"
          />
          {nodes.length > 1 && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setNodes(nodes.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setNodes([...nodes, { host: "127.0.0.1", port: 6379 }])}
      >
        <Plus size={14} />
        {t("connection.addNode")}
      </Button>
      <div className="space-y-2">
        <Label>{t("connection.username")}</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("connection.password")}</Label>
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
      </div>
    </>
  );
}
