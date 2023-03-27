import * as cmd from '@/utils/cmd';
import request, { CommArgs } from '@/utils/request';

export interface Connection {
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
export interface SaveParams extends Connection, CommArgs {
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 集群 */
  cluster?: number;
  /** 集群节点 */
  nodes?: string;
  /** 安全类型 0: 不使用 1：ssl/tls  2：ssh tunnel */
  securityType?: number;
  /** 是否使用私钥  */
  usePrivateKey?: number;
  /** ssh 隧道的用户名  */
  sshUsername?: string;
  /** ssh 隧道的地址 */
  sshHost?: string;
  /** ssh隧道的端口号 默认22 */
  sshPort?: number;
  /** ssh隧道密码 私钥是为私钥密码 */
  sshPassword?: string;
  /** 私钥文件路径 */
  privateKeyPath?: string;
  /** 默认过滤 */
  keyFilter: string;
  /** 命名空间分隔符 */
  delimiter: string;
}

export function saveCon(params: SaveParams) {
  return request<SaveParams>(cmd.SAVE_CON, { server: params });
}
