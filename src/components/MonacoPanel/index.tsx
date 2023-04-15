import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button, Select } from '@arco-design/web-react';
import MonacoEditor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { Monaco } from '@monaco-editor/react';
import st from './index.module.css';
import { MutableRefObject } from 'react';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
}

function MonacoPanel({ value, theme }: Props) {
  const monacoRef: MutableRefObject<Monaco | undefined> = useRef<Monaco>();
  const editorRef: MutableRefObject<editor.IStandaloneCodeEditor | undefined> =
    useRef<editor.IStandaloneCodeEditor>();
  const monacoOptions: editor.IStandaloneEditorConstructionOptions = useMemo(
    () => ({
      wordWrap: 'on',
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true,
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
      autoIndent: 'none',
      roundedSelection: false,
      scrollBeyondLastLine: false,
    }),
    []
  );

  useEffect(() => {
    console.debug(value);
  }, [value]);

  const options = useMemo(() => ['plaintext', 'json', 'markdown'], []);

  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      monacoRef.current = monaco;
      editorRef.current = editor;
    },
    []
  );

  const onLanguageChange = (language: string) => {
    const model = editorRef.current?.getModel?.();
    if (model) {
      monacoRef?.current?.editor?.setModelLanguage?.(model, language);
    }
    editorRef.current?.trigger?.('editor', 'editor.action.formatDocument', '');
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
        <Button className={st.btn}>save</Button>
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
