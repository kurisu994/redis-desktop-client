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

export const UnresolvedKeyTypes = [
  RedisKeyType.GEO,
  RedisKeyType.BITMAP,
  RedisKeyType.HYPERLOGLOG,
  RedisKeyType.STREAM,
];

/**
 * The value MUST exist, but can be undefined
 */
export type Maybe<T> = T | undefined;

/**
 * The value can have NULL value
 */
export type Nullable<T> = T | null;
