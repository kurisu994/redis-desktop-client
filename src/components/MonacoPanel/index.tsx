import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Select } from '@arco-design/web-react';
import MonacoEditor from '@monaco-editor/react';
import { Monaco, MonacoDiffEditor } from '@monaco-editor/react';
import st from './index.module.css';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
}

function MonacoPanel({ value, theme }: Props) {
  const monacoRef = useRef<any>(null);
  const monacoOptions = useMemo(
    () => ({
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
    }),
    []
  );
  const options = useMemo(() => ['plaintext', 'json', 'markdown'], []);

  const handleEditorDidMount = useCallback(
    (editor: MonacoDiffEditor, monaco: Monaco) => {
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
    },
    []
  );

  const onLanguageChange = (language: string) => {
    console.log(language, monacoRef?.current?.editor);
    // monacoRef?.current?.editor?.setModelLanguage?.(
    //   monacoRef?.current?.editor?.getModel(),
    //   language
    // );
  };

  return (
    <div className={st.wrapper}>
      <div className={st.option}>
        <Select
          style={{ width: 160 }}
          defaultValue="plaintext"
          onChange={onLanguageChange}
          options={options}
        />
      </div>
      <MonacoEditor
        theme={theme}
        defaultLanguage="plaintext"
        options={monacoOptions}
        value={value}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}

export default MonacoPanel;
