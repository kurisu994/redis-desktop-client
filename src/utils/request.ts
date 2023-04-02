import { invoke } from '@tauri-apps/api/tauri';

export interface CommArgs {
  [key: string]: unknown;
}

export default async function request<T>(api: string, args?: CommArgs) {
  return new Promise<T | undefined>((resolve, reject) => {
    invoke<T>(api, args)
      .then((res) => {
        resolve(res);
      })
      .catch((e) => {
        console.log(e);
        reject(new Error(e));
      });
  });
}
