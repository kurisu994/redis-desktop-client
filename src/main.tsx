import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from '@arco-design/web-react';
import { GlobalContext } from './context';
import App from './pages/index';
import Setting from './pages/setting';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import './styles.css';

type Theme = 'light' | 'dark' | 'auto';
type LangType = 'en-US' | 'zh-CN';

function Index() {
  const [lang, setLang] = useState<LangType>('zh-CN');
  const [theme, setTheme] = useState<Theme>('light');

  const contextValue = {
    lang,
    setLang,
    theme,
    setTheme,
  };
  const getArcoLocale = () => {
    switch (lang) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      default:
        return zhCN;
    }
  };

  return (
    <ConfigProvider
      locale={getArcoLocale()}
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
