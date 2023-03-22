import { useContext } from 'react';
import { GlobalContext } from '../context';
import defaultLocale from '../locale';

export type LangType = 'en-US' | 'zh-CN';

function useLocale(locale = null) {
  const { lang = '' } = useContext(GlobalContext);

  //@ts-ignore ignore
  return (locale || defaultLocale)[lang] || {};
}

export default useLocale;
