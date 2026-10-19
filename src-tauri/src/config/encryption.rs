use aes_gcm::aead::{Aead, OsRng};
use aes_gcm::{AeadCore, Aes256Gcm, Key, KeyInit, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use std::path::Path;

/// 加密后的数据格式：base64(nonce + ciphertext)
///
/// nonce 固定 12 字节，拼接在密文前面。
///
/// Master Key 只从 `key_path` 这个文件读取或创建。不接受环境变量、IPC 参数或
/// `connections.json` 里的副本，避免密钥跟着配置导出或出现在进程环境里。
pub fn get_or_create_master_key(key_path: &Path) -> Result<[u8; 32], String> {
    if key_path.exists() {
        restrict_key_file(key_path)?;
        let content = std::fs::read_to_string(key_path).map_err(|e| e.to_string())?;
        let key_bytes = BASE64.decode(content.trim()).map_err(|e| e.to_string())?;
        if key_bytes.len() != 32 {
            return Err("Master key 长度无效".into());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        Ok(key)
    } else {
        let key = Aes256Gcm::generate_key(OsRng);
        let key_b64 = BASE64.encode(key.as_slice());
        if let Some(parent) = key_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(key_path, &key_b64).map_err(|e| e.to_string())?;
        restrict_key_file(key_path)?;
        let mut arr = [0u8; 32];
        arr.copy_from_slice(key.as_slice());
        Ok(arr)
    }
}

/// 把密钥文件收紧到仅所有者可读写。非 Unix 平台没有对应权限位，跳过。
fn restrict_key_file(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
        if meta.permissions().mode() & 0o077 != 0 {
            let mut perm = meta.permissions();
            perm.set_mode(0o600);
            std::fs::set_permissions(path, perm).map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(unix))]
    {
        let _ = path;
    }
    Ok(())
}

/// 加密密码 — 返回 base64 编码的 (nonce + ciphertext)
pub fn encrypt_password(master_key: &[u8; 32], plaintext: &str) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(master_key);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| format!("加密失败: {e}"))?;

    let mut combined = nonce.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

/// 解密密码 — 输入 base64 编码的 (nonce + ciphertext)
pub fn decrypt_password(master_key: &[u8; 32], encrypted: &str) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(master_key);
    let cipher = Aes256Gcm::new(key);
    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| format!("base64 解码失败: {e}"))?;

    if combined.len() < 12 {
        return Err("加密数据格式无效".into());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("解密失败: {e}"))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 解码失败: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = [42u8; 32];
        let password = "my-secret-password";
        let encrypted = encrypt_password(&key, password).unwrap();
        let decrypted = decrypt_password(&key, &encrypted).unwrap();
        assert_eq!(decrypted, password);
    }

    #[test]
    fn test_empty_password() {
        let key = [42u8; 32];
        let encrypted = encrypt_password(&key, "").unwrap();
        let decrypted = decrypt_password(&key, &encrypted).unwrap();
        assert_eq!(decrypted, "");
    }

    #[test]
    fn master_key_is_file_only_and_mode_0600() {
        let dir = std::env::temp_dir().join(format!("rdc-key-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("master-key");
        let first = get_or_create_master_key(&path).unwrap();
        let second = get_or_create_master_key(&path).unwrap();
        assert_eq!(first, second);
        let raw = std::fs::read_to_string(&path).unwrap();
        assert_eq!(raw.trim().len(), 44);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = std::fs::metadata(&path).unwrap().permissions().mode() & 0o777;
            assert_eq!(mode, 0o600);
            let mut perm = std::fs::metadata(&path).unwrap().permissions();
            perm.set_mode(0o644);
            std::fs::set_permissions(&path, perm).unwrap();
            let _ = get_or_create_master_key(&path).unwrap();
            let tightened = std::fs::metadata(&path).unwrap().permissions().mode() & 0o777;
            assert_eq!(tightened, 0o600);
        }
        let _ = std::fs::remove_dir_all(dir);
    }
}
