import React, { useEffect, useMemo, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { Monaco } from '@monaco-editor/react';
import st from './index.module.less';
import { Nullable } from '@/typing/global';
import helper from '@/utils/helper';
import { Format } from '@icon-park/react';
import { Button, Message } from '@arco-design/web-react';
import { IconCopy } from '@arco-design/web-react/icon';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
  language?: string;
  onChange?: (value?: string) => unknown;
}

type IEditorMount = {
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  monaco: typeof monacoEditor;
};

function MonacoPanel({
  value,
  theme,
  language = 'plaintext',
  onChange,
}: Props) {
  const monacoObjects = useRef<Nullable<IEditorMount>>(null);

  useEffect(() => {
    window.onresize = helper.debounce(() =>
      monacoObjects.current?.editor?.layout()
    );
    return () => {
      window.onresize = null;
    };
  }, []);

  const monacoOptions: editor.IStandaloneEditorConstructionOptions = useMemo(
    () => ({
      wordWrap: 'on',
      automaticLayout: false,
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
      contextmenu: false,
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
    monacoObjects.current = { editor, monaco };
    editor?.layout();
  };
  const _onChange = (value: string | undefined) => {
    onChange?.(value);
  };

  const handleFormat = () => {
    monacoObjects.current?.editor?.layout();
    if (language == 'json') {
      monacoObjects.current?.editor.trigger(
        'editor',
        'editor.action.formatDocument',
        {}
      );
    }
  };

  const handleCopy = () => {
    const { editor } = monacoObjects.current || {};
    const value = editor?.getValue();
    if (value) {
      helper
        .clipboard(value)
        .then(() => Message.success('复制成功'))
        .catch((e) => Message.error(e.message));
    }
  };

  return (
    <div className={st.wrapper}>
      <div className={st.format}>
        <Button.Group>
          <Button icon={<Format />} onClick={handleFormat} />
          <Button icon={<IconCopy />} onClick={handleCopy} />
        </Button.Group>
      </div>
      <MonacoEditor
        theme={theme}
        language={language}
        options={monacoOptions}
        value={value}
        onChange={_onChange}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}

export default React.memo(MonacoPanel);
