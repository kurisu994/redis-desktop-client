export function isArray(val: object): boolean {
  return Object.prototype.toString.call(val) === '[object Array]';
}
export function isObject(val: object): boolean {
  return Object.prototype.toString.call(val) === '[object Object]';
}
export function isString(val: object): boolean {
  return Object.prototype.toString.call(val) === '[object String]';
}