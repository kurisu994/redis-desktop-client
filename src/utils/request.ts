import { invoke } from '@tauri-apps/api/tauri';

export interface CommArgs {
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
          console.log(res);
          reject(new Error(res.msg));
        }
      })
      .catch((e) => {
        console.log(e);
        reject(new Error(e));
      });
  });
}
