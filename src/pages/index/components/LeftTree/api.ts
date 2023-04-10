import * as CMD from '@/utils/cmd';
import request from '@/utils/request';

interface DbInfo {
  /** db下标 */
  id: number;
  /** db名称 */
  name: string;
  /** db内key的数量 */
  count: number;
}
export function queryDbs(id?: number) {
  return request<DbInfo[]>(CMD.GET_DBS, { id });
}

export function queryRedisKeys(id: number, db: number) {
  return request<String[]>(CMD.KEY_LIST, { id, db });
}
