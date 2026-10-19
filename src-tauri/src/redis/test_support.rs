//! 不依赖外部 Redis 的连接回归测试工具。

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener};
use std::time::Duration;
use tokio::sync::oneshot;

/// 为 Redis 建连时的 SELECT / CLIENT SETINFO 等命令返回 OK，PING 返回 PONG。
pub(super) fn serve_redis(mut stream: impl Read + Write) {
    let mut parser = redis::Parser::new();
    while let Ok(value) = parser.parse_value(&mut stream) {
        let is_ping = matches!(
            value,
            redis::Value::Array(ref args)
                if matches!(args.first(), Some(redis::Value::BulkString(cmd)) if cmd == b"PING")
        );
        let reply: &[u8] = if is_ping { b"+PONG\r\n" } else { b"+OK\r\n" };
        if stream
            .write_all(reply)
            .and_then(|()| stream.flush())
            .is_err()
        {
            break;
        }
    }
}

/// 建立单连接测试服务；接收 TCP 后等待 resume，便于精确控制异步建连的完成顺序。
pub(super) fn paused_redis_server() -> (
    SocketAddr,
    oneshot::Receiver<()>,
    oneshot::Sender<()>,
    tokio::task::JoinHandle<()>,
) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let (accepted_tx, accepted_rx) = oneshot::channel();
    let (resume_tx, resume_rx) = oneshot::channel();
    let task = tokio::task::spawn_blocking(move || {
        let (stream, _) = listener.accept().unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        stream
            .set_write_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        let _ = accepted_tx.send(());
        if resume_rx.blocking_recv().is_ok() {
            serve_redis(stream);
        }
    });
    (addr, accepted_rx, resume_tx, task)
}
