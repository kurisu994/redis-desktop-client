/// redis 连接维护
/** 查询所有连接 */
export const GET_SERVERS = 'all_server';
/** 保存或修改连接 */
export const SAVE_SERVER = 'save_server';
/** 复制某个连接 */
export const COPY_SERVER = 'copy_server';
/** 移除连接 */
export const REMOVE_SERVER = 'delete_server';
/** 测试连接 */
export const TEST_SERVER = 'test_server';

/// 设置维护
/** 查询设置 */
export const GET_SETTING = 'query_setting';
/** 查询设置 */
export const UPDATE_SETTING = 'update_setting';

/// redis 操作相关
/** 查询db列表 */
const GET_DBS = 'read_redis_dbs';
/** 查询redis状态 */
const REDIS_STATUS = 'read_redis_status';
/** 查询redis key列表 */
const KEY_LIST = 'read_redis_key_list';
/** 查询redis key树 */
const KEY_TREE = 'read_redis_key_tree';
/** 关闭redis连接 */
const CLOSE_REDIS = 'close_redis';
/** 查询redis key的值 */
const READ_VALUE = 'read_redis_value';
/** 修改key的过期时间 */
const UPDATE_TTL = 'update_redis_key_ttl';
/** 删除某个key  */
const DELETE_KEY = 'delete_redis_key';
/** 重命名某个key */
const RENAME_KEY = 'rename_key';
