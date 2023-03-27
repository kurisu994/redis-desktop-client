import { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from '@arco-design/web-react';
import { GlobalContext } from './context';
import App from './pages/index';
import Setting from './pages/setting';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import { Theme } from './utils/changeTheme';
import { LangType } from './utils/useLocale';
import '@icon-park/react/styles/index.css';
import './styles.css';

function Index() {
  const [lang, setLang] = useState<LangType>('zh-CN');
  const [theme, setTheme] = useState<Theme>('light');
  const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');

  const listener = (e: MediaQueryListEvent) => {
    if (e.matches) {
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      document.body.removeAttribute('arco-theme');
    }
  };
  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
  };

  useEffect(() => {
    if (theme === 'auto') {
      darkThemeMq.addEventListener('change', listener);
      if (darkThemeMq.matches) {
        document.body.setAttribute('arco-theme', 'dark');
      } else {
        document.body.removeAttribute('arco-theme');
      }
    } else if (theme === 'dark') {
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      document.body.removeAttribute('arco-theme');
    }
  }, [darkThemeMq, theme]);

  const locale = useMemo(() => {
    switch (lang) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      default:
        return zhCN;
    }
  }, [lang]);

  return (
    <ConfigProvider
      locale={locale}
      componentConfig={{
        Card: {
          bordered: false,
        },
        List: {
          bordered: false,
        },
        Table: {
          border: false,
        },
      }}
    >
      <GlobalContext.Provider value={contextValue}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/setting" element={<Setting />} />
          </Routes>
        </BrowserRouter>
      </GlobalContext.Provider>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Index />
);
