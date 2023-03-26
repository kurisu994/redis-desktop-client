import * as cmd from '@/utils/cmd';
import request from '@/utils/request';

interface Connection {
  /** id */
  id?: number;
  /** 名称 */
  name: string;
  /** 地址 */
  host: string;
  /** 端口 */
  port: number;
}

export function getConList() {
  return request<Connection[]>(cmd.GET_CONS);
}
