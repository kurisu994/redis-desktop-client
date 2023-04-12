import { createContext, useState } from 'react';
import { LangType } from './utils/useLocale';
import { Theme } from '@/typing/global';

type IContext = {
  lang?: LangType;
  setLang?: Function;
  theme?: Theme;
  setTheme?: Function;
  monacoTheme?: 'vs-dark' | 'light';
  setMonacoTheme?: (theme: 'vs-dark' | 'light') => unknown;
};
export const GlobalContext = createContext<IContext>({});

export function GlobalContextProvider({ children }: any) {
  const [lang, setLang] = useState<LangType>('zh-CN');
  const [theme, setTheme] = useState<Theme>(Theme.AUTO);
  const [monacoTheme, setMonacoTheme] = useState<'vs-dark' | 'light'>('light');

  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
    monacoTheme,
    setMonacoTheme,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}
