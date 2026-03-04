use aes_gcm::aead::{Aead, OsRng};
use aes_gcm::{AeadCore, Aes256Gcm, Key, KeyInit, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use std::path::Path;

/// 加密后的数据格式：base64(nonce + ciphertext)
/// nonce 固定 12 字节，拼接在密文前面

/// 获取或生成 Master Key — 首次运行生成并持久化到文件
pub fn get_or_create_master_key(key_path: &Path) -> Result<[u8; 32], String> {
    if key_path.exists() {
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
        let mut arr = [0u8; 32];
        arr.copy_from_slice(key.as_slice());
        Ok(arr)
    }
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
    let combined = BASE64.decode(encrypted).map_err(|e| format!("base64 解码失败: {e}"))?;

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
}
