import { useRef } from 'react';
import { Layout, Button, Typography } from '@arco-design/web-react';
import { IconMenuUnfold, IconMenuFold } from '@arco-design/web-react/icon';
import MonacoEditor from '@monaco-editor/react';
import { Monaco, MonacoDiffEditor } from '@monaco-editor/react';
import st from './index.module.css';
import { RedisValue } from '@/pages/index/api';

const Header = Layout.Header;
const Content = Layout.Content;

interface Props {
  siderCollapsed?: boolean;
  handlerSiderCollapse?: () => unknown;
  redisValue?: RedisValue;
}
const options = {
  wordWrap: 'on',
  // automaticLayout: true,
  formatOnPaste: false,
  padding: { top: 10 },
  suggest: {
    preview: false,
    showStatusBar: false,
    showIcons: false,
    showProperties: false,
  },
  quickSuggestions: false,
  minimap: {
    enabled: false,
  },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  lineNumbersMinChars: 4,
  autoIndent: true,
};

function RightContent({
  siderCollapsed,
  handlerSiderCollapse,
  redisValue,
}: Props) {
  console.debug(redisValue);
  const monacoRef = useRef(null);
  function handleEditorDidMount(editor: MonacoDiffEditor, monaco: Monaco) {
    monacoRef.current = monaco;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemaValidation: 'error',
      schemaRequest: 'error',
      trailingCommas: 'error',
    });
    // monaco.languages.json.jsonDefaults.setModeConfiguration({
    //   documentRangeFormattingEdits: true,
    //   documentFormattingEdits: true,
    //   foldingRanges: true,
    //   colors: true,
    //   completionItems: true,
    //   selectionRanges: true,
    // });
  }

  return (
    <Layout>
      <Header className={st.header}>
        <Button
          type="text"
          iconOnly
          className={st.trigger}
          onClick={() => handlerSiderCollapse?.()}
        >
          {siderCollapsed ? (
            <IconMenuUnfold className={st.icon} />
          ) : (
            <IconMenuFold className={st.icon} />
          )}
        </Button>
      </Header>
      <Layout className={st['content-wrapper ']}>
        <Content className={st.content}>
          <Typography.Title>GUI for Redis</Typography.Title>
          <div className={st.wrapper}>
            {redisValue && (
              <MonacoEditor
                theme="vs-dark"
                language="json"
                options={options}
                value={redisValue?.value}
                onMount={handleEditorDidMount}
              />
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default RightContent;
