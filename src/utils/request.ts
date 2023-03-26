import { invoke } from '@tauri-apps/api/tauri';

interface CommArgs {
  [key: string]: unknown;
}

interface Message<T> {
  data?: T;
  code: number;
  success: boolean;
  msg: string;
}

export default async function request<T>(api: string, args?: CommArgs) {
  return new Promise<T | undefined>((resolve, reject) => {
    invoke<Message<T>>(api, args)
      .then((res) => {
        if (res.success) {
          resolve(res.data);
        } else {
          reject(res.msg);
        }
      })
      .catch((e) => {
        reject(e.message);
      });
  });
}
