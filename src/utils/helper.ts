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
/**
 * 复制
 * @param text 文本
 * @returns any
 */
function clipboard(text: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).catch((err) => {
      throw err !== undefined
        ? err
        : new DOMException('The request is not allowed', 'NotAllowedError');
    });
  }

  const span = document.createElement('span');
  span.textContent = text;

  span.style.whiteSpace = 'pre';

  document.body.appendChild(span);

  const selection = window.getSelection();
  const range = window.document.createRange();
  selection?.removeAllRanges();
  range.selectNode(span);
  selection?.addRange(range);

  let success = false;
  try {
    success = window.document.execCommand('copy');
  } catch (err) {
    console.log('error', err);
  }

  selection?.removeAllRanges();
  window.document.body.removeChild(span);

  return success
    ? Promise.resolve()
    : Promise.reject(
        new DOMException('The request is not allowed', 'NotAllowedError')
      );
}

export default {
  debounce,
  clipboard,
};
