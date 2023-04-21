/** 防抖 */
/** 防抖 */
function debounce(fn: Function, delay = 300) {
  let timer: number | undefined;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, delay);
  };
}

export default {
  debounce,
};
