import { useContext, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from '@arco-design/web-react';
import { GlobalContext, GlobalContextProvider } from './context';
import App from './pages/index';
import Setting from './pages/setting';
import { Theme } from '@/typing/global';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import changeTheme from './utils/changeTheme';
import '@icon-park/react/styles/index.css';
import './styles.css';

function Index() {
  const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');
  const { theme, lang, setMonacoTheme } = useContext(GlobalContext);

  const listener = (e: MediaQueryListEvent) => {
    changeTheme(e.matches ? Theme.DARK : Theme.LIGHT);
    setMonacoTheme?.(e.matches ? 'vs-dark' : 'light');
  };

  useEffect(() => {
    if (theme === Theme.AUTO) {
      darkThemeMq.addEventListener('change', listener);
      changeTheme(darkThemeMq.matches ? Theme.DARK : Theme.LIGHT);
      setMonacoTheme?.(darkThemeMq.matches ? 'vs-dark' : 'light');
    } else {
      changeTheme(theme);
      setMonacoTheme?.(theme == Theme.DARK ? 'vs-dark' : 'light');
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
      <GlobalContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/setting" element={<Setting />} />
          </Routes>
        </BrowserRouter>
      </GlobalContextProvider>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Index />
);
