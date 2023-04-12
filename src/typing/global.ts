export enum Theme {
  AUTO = 1,
  LIGHT,
  DARK,
}

export enum TtlPolicy {
  EXPIRE = 1,
  EXPIREAT,
  PEXPIRE,
  PERSIST,
}

export enum RedisKeyType {
  STRING = 1,
  LIST,
  SET,
  ZSET,
  HASH,
  GEO,
  BITMAP,
  HYPERLOGLOG,
  STREAM,
}
