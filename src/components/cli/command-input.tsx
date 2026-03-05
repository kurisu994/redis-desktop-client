"use client";

import { useTranslation } from "react-i18next";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

/** Redis 命令字典（命令名 + 参数提示） */
const REDIS_COMMANDS: Record<string, string> = {
  // 通用
  PING: "",
  ECHO: "message",
  SELECT: "index",
  DBSIZE: "",
  FLUSHDB: "[ASYNC | SYNC]",
  FLUSHALL: "[ASYNC | SYNC]",
  INFO: "[section]",
  CONFIG: "GET|SET parameter [value]",
  KEYS: "pattern",
  SCAN: "cursor [MATCH pattern] [COUNT count]",
  TYPE: "key",
  TTL: "key",
  PTTL: "key",
  EXPIRE: "key seconds",
  PEXPIRE: "key milliseconds",
  PERSIST: "key",
  DEL: "key [key ...]",
  UNLINK: "key [key ...]",
  EXISTS: "key [key ...]",
  RENAME: "key newkey",
  RENAMENX: "key newkey",
  DUMP: "key",
  RESTORE: "key ttl serialized-value",
  OBJECT: "ENCODING|IDLETIME|REFCOUNT|HELP key",
  MEMORY: "USAGE key [SAMPLES count]",
  RANDOMKEY: "",
  COPY: "source destination [DB destination-db] [REPLACE]",
  // String
  GET: "key",
  SET: "key value [EX seconds | PX ms | EXAT ts | PXAT ms-ts | KEEPTTL] [NX | XX]",
  MGET: "key [key ...]",
  MSET: "key value [key value ...]",
  SETNX: "key value",
  SETEX: "key seconds value",
  PSETEX: "key milliseconds value",
  GETSET: "key value",
  GETDEL: "key",
  GETEX: "key [EX seconds | PX ms | EXAT ts | PXAT ms-ts | PERSIST]",
  INCR: "key",
  INCRBY: "key increment",
  INCRBYFLOAT: "key increment",
  DECR: "key",
  DECRBY: "key decrement",
  APPEND: "key value",
  STRLEN: "key",
  GETRANGE: "key start end",
  SETRANGE: "key offset value",
  // Hash
  HGET: "key field",
  HSET: "key field value [field value ...]",
  HMGET: "key field [field ...]",
  HMSET: "key field value [field value ...]",
  HDEL: "key field [field ...]",
  HEXISTS: "key field",
  HGETALL: "key",
  HKEYS: "key",
  HVALS: "key",
  HLEN: "key",
  HINCRBY: "key field increment",
  HINCRBYFLOAT: "key field increment",
  HSETNX: "key field value",
  HSCAN: "key cursor [MATCH pattern] [COUNT count]",
  // List
  LPUSH: "key element [element ...]",
  RPUSH: "key element [element ...]",
  LPOP: "key [count]",
  RPOP: "key [count]",
  LRANGE: "key start stop",
  LLEN: "key",
  LINDEX: "key index",
  LSET: "key index element",
  LINSERT: "key BEFORE|AFTER pivot element",
  LREM: "key count element",
  LTRIM: "key start stop",
  BLPOP: "key [key ...] timeout",
  BRPOP: "key [key ...] timeout",
  LPOS: "key element [RANK rank] [COUNT num-matches] [MAXLEN len]",
  LMPOP: "numkeys key [key ...] LEFT|RIGHT [COUNT count]",
  // Set
  SADD: "key member [member ...]",
  SREM: "key member [member ...]",
  SMEMBERS: "key",
  SISMEMBER: "key member",
  SMISMEMBER: "key member [member ...]",
  SCARD: "key",
  SPOP: "key [count]",
  SRANDMEMBER: "key [count]",
  SINTER: "key [key ...]",
  SUNION: "key [key ...]",
  SDIFF: "key [key ...]",
  SINTERSTORE: "destination key [key ...]",
  SUNIONSTORE: "destination key [key ...]",
  SDIFFSTORE: "destination key [key ...]",
  SSCAN: "key cursor [MATCH pattern] [COUNT count]",
  // Sorted Set
  ZADD: "key [NX | XX] [GT | LT] [CH] [INCR] score member [score member ...]",
  ZREM: "key member [member ...]",
  ZSCORE: "key member",
  ZRANK: "key member",
  ZREVRANK: "key member",
  ZRANGE: "key min max [BYSCORE | BYLEX] [REV] [LIMIT offset count] [WITHSCORES]",
  ZRANGEBYSCORE: "key min max [WITHSCORES] [LIMIT offset count]",
  ZREVRANGEBYSCORE: "key max min [WITHSCORES] [LIMIT offset count]",
  ZCARD: "key",
  ZCOUNT: "key min max",
  ZINCRBY: "key increment member",
  ZPOPMIN: "key [count]",
  ZPOPMAX: "key [count]",
  ZRANDMEMBER: "key [count [WITHSCORES]]",
  ZMSCORE: "key member [member ...]",
  ZSCAN: "key cursor [MATCH pattern] [COUNT count]",
  // Stream
  XADD: "key [NOMKSTREAM] [MAXLEN | MINID [= | ~] threshold [LIMIT count]] * | id field value [field value ...]",
  XLEN: "key",
  XRANGE: "key start end [COUNT count]",
  XREVRANGE: "key end start [COUNT count]",
  XREAD: "[COUNT count] [BLOCK ms] STREAMS key [key ...] id [id ...]",
  XDEL: "key id [id ...]",
  XTRIM: "key MAXLEN | MINID [= | ~] threshold [LIMIT count]",
  XINFO: "STREAM|GROUPS|CONSUMERS key [group]",
  XGROUP: "CREATE|SETID|DESTROY|CREATECONSUMER|DELCONSUMER key group [id | consumer]",
  XACK: "key group id [id ...]",
  XPENDING: "key group [IDLE min-idle-time] [start end count] [consumer]",
  XCLAIM: "key group consumer min-idle-time id [id ...]",
  // Pub/Sub
  SUBSCRIBE: "channel [channel ...]",
  UNSUBSCRIBE: "[channel [channel ...]]",
  PUBLISH: "channel message",
  PSUBSCRIBE: "pattern [pattern ...]",
  PUNSUBSCRIBE: "[pattern [pattern ...]]",
  // Server
  CLIENT: "GETNAME|ID|INFO|LIST|KILL|SETNAME|UNPAUSE ...",
  COMMAND: "[COUNT | DOCS | GETKEYS | INFO | LIST]",
  SLOWLOG: "GET [count] | LEN | RESET",
  MONITOR: "",
  DEBUG: "OBJECT key | SLEEP seconds",
  TIME: "",
  LASTSAVE: "",
  BGSAVE: "[SCHEDULE]",
  BGREWRITEAOF: "",
  SAVE: "",
  SHUTDOWN: "[NOSAVE | SAVE] [NOW] [FORCE]",
  // Cluster
  CLUSTER: "INFO|NODES|SLOTS|MYID ...",
  // Script
  EVAL: "script numkeys [key ...] [arg ...]",
  EVALSHA: "sha1 numkeys [key ...] [arg ...]",
  SCRIPT: "EXISTS|FLUSH|LOAD ...",
};

const COMMAND_NAMES = Object.keys(REDIS_COMMANDS);

interface CommandInputProps {
  /** 命令历史 */
  history: string[];
  /** 当前历史索引 */
  historyIndex: number;
  /** 回调：执行命令 */
  onExecute: (command: string) => void;
  /** 回调：历史索引变更 */
  onHistoryIndexChange: (index: number) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 命令输入框 — 支持自动补全和历史浏览 */
export function CommandInput({
  history,
  historyIndex,
  onExecute,
  onHistoryIndexChange,
  disabled,
}: CommandInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [paramHint, setParamHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const savedInput = useRef("");

  /** 聚焦输入框 */
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // 点击终端区域时聚焦到输入框
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cli-terminal]") && !target.closest("input")) {
        focusInput();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [focusInput]);

  /** 计算自动补全建议 */
  const updateSuggestions = useCallback((value: string) => {
    const trimmed = value.trim();
    const firstWord = trimmed.split(/\s+/)[0]?.toUpperCase() || "";

    // 如果已输入完整命令名（含空格），显示参数提示
    if (trimmed.includes(" ")) {
      const hint = REDIS_COMMANDS[firstWord];
      setParamHint(hint !== undefined ? `${firstWord} ${hint}` : "");
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 过滤匹配的命令
    if (firstWord.length > 0) {
      const matched = COMMAND_NAMES.filter((cmd) =>
        cmd.startsWith(firstWord)
      ).slice(0, 10);
      setSuggestions(matched);
      setShowSuggestions(matched.length > 0 && matched[0] !== firstWord);
      setSelectedSuggestion(0);
      setParamHint("");
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setParamHint("");
    }
  }, []);

  /** 当前命令的参数提示 */
  const activeHint = useMemo(() => {
    if (paramHint) return paramHint;
    if (suggestions.length === 1) {
      const cmd = suggestions[0];
      const hint = REDIS_COMMANDS[cmd];
      return hint ? `${cmd} ${hint}` : cmd;
    }
    return "";
  }, [paramHint, suggestions]);

  /** 处理输入变化 */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInput(value);
      updateSuggestions(value);
    },
    [updateSuggestions]
  );

  /** 处理键盘事件 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Tab: 自动补全
      if (e.key === "Tab") {
        e.preventDefault();
        if (suggestions.length > 0) {
          const selected = suggestions[selectedSuggestion];
          setInput(selected + " ");
          setShowSuggestions(false);
          const hint = REDIS_COMMANDS[selected];
          setParamHint(hint ? `${selected} ${hint}` : "");
        }
        return;
      }

      // 上下箭头：补全列表导航 / 历史浏览
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (showSuggestions) {
          setSelectedSuggestion((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        } else {
          // 浏览历史
          if (history.length === 0) return;
          if (historyIndex === -1) {
            savedInput.current = input;
            const newIdx = history.length - 1;
            onHistoryIndexChange(newIdx);
            setInput(history[newIdx]);
          } else if (historyIndex > 0) {
            const newIdx = historyIndex - 1;
            onHistoryIndexChange(newIdx);
            setInput(history[newIdx]);
          }
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (showSuggestions) {
          setSelectedSuggestion((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        } else {
          // 浏览历史
          if (historyIndex === -1) return;
          if (historyIndex < history.length - 1) {
            const newIdx = historyIndex + 1;
            onHistoryIndexChange(newIdx);
            setInput(history[newIdx]);
          } else {
            onHistoryIndexChange(-1);
            setInput(savedInput.current);
          }
        }
        return;
      }

      // Enter: 执行命令
      if (e.key === "Enter") {
        e.preventDefault();
        if (showSuggestions && suggestions.length > 0) {
          const selected = suggestions[selectedSuggestion];
          setInput(selected + " ");
          setShowSuggestions(false);
          const hint = REDIS_COMMANDS[selected];
          setParamHint(hint ? `${selected} ${hint}` : "");
          return;
        }
        const cmd = input.trim();
        if (cmd) {
          onExecute(cmd);
          setInput("");
          setSuggestions([]);
          setShowSuggestions(false);
          setParamHint("");
          savedInput.current = "";
        }
        return;
      }

      // Escape: 关闭补全
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }

      // Ctrl+L: 清屏（由外部处理）
      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        // 不阻止默认行为，让父组件处理
        return;
      }
    },
    [
      input,
      suggestions,
      selectedSuggestion,
      showSuggestions,
      history,
      historyIndex,
      onExecute,
      onHistoryIndexChange,
    ]
  );

  return (
    <div className="relative border-t border-border">
      {/* 参数提示 */}
      {activeHint && (
        <div className="px-3 py-1 text-xs text-muted-foreground font-mono bg-muted/50 dark:bg-muted/5 border-b border-border">
          {activeHint}
        </div>
      )}

      {/* 自动补全下拉 */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 z-10 max-h-48 overflow-y-auto bg-card border border-border rounded-t-lg shadow-lg">
          {suggestions.map((cmd, i) => (
            <button
              key={cmd}
              className={`w-full text-left px-3 py-1.5 font-mono text-sm flex justify-between items-center ${
                i === selectedSuggestion
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary"
                  : "hover:bg-accent"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setInput(cmd + " ");
                setShowSuggestions(false);
                focusInput();
              }}
            >
              <span>{cmd}</span>
              <span className="text-xs text-muted-foreground truncate ml-4">
                {REDIS_COMMANDS[cmd]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 输入框 */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-green-500 font-mono text-sm select-none shrink-0">
          redis&gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // 延迟关闭，避免点击建议时触发
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          disabled={disabled}
          placeholder={t("cli.placeholder")}
          className="flex-1 bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-muted-foreground"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
