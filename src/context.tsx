import { createContext } from 'react';
import { Theme } from './utils/changeTheme';
import { LangType } from './utils/useLocale';

export const GlobalContext = createContext<{
  lang?: LangType;
  setLang?: Function;
  theme?: Theme;
  setTheme?: Function;
}>({});
