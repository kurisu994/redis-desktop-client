import React, { useMemo, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { Monaco } from '@monaco-editor/react';
import st from './index.module.less';
import { Nullable } from '@/typing/global';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
  language?: string;
}

type IEditorMount = {
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  monaco: typeof monacoEditor;
};

function MonacoPanel({ value, theme, language = 'plaintext' }: Props) {
  const monacoObjects = useRef<Nullable<IEditorMount>>(null);

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
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 5,
        horizontalScrollbarSize: 5,
      },
    }),
    []
  );

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemaValidation: 'error',
      schemaRequest: 'error',
      trailingCommas: 'error',
    });
    editor.onDidChangeModelLanguage((e) => formatDocument(e.newLanguage));
    monacoObjects.current = { editor, monaco };
    formatDocument(language);
  };

  const formatDocument = (lan: string) => {
    if (lan == 'json') {
      monacoObjects.current?.editor.trigger(
        'editor',
        'editor.action.formatDocument',
        {}
      );
    }
  };

  return (
    <div className={st.wrapper}>
      <MonacoEditor
        theme={theme}
        language={language}
        options={monacoOptions}
        value={value}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}

export default React.memo(MonacoPanel);
