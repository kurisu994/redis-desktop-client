import { useEffect, useMemo, useState } from 'react';
import MonacoDetail from '../MonacoDetail';
import st from './index.module.less';
import EditorOption from '@/components/EditorOption';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
  onSave?: (value: string) => unknown;
  disabled?: boolean;
}
function MonacoPanel({ value, theme, onSave, disabled }: Props) {
  const [data, setData] = useState<string>(value || '');
  const [language, setLanguage] = useState<string>('plaintext');
  const languages = useMemo(() => ['plaintext', 'json', 'markdown'], []);

  useEffect(() => {
    setData(value || '');
  }, [value]);

  const handleChange = (val = '') => {
    setData(val);
  };

  const handSave = () => {
    if (language == 'json') {
      const _data = data
        ?.replaceAll('\t', '')
        .replaceAll('\n', '')
        .replaceAll(' ', '');
      onSave?.(_data);
      return;
    }
    onSave?.(data);
  };

  return (
    <div className={st.editor}>
      <EditorOption
        size={new Blob([value ?? '']).size}
        language={language}
        languages={languages}
        changeLanguage={(v) => setLanguage(v)}
        handSave={handSave}
        disabled={disabled}
      />
      <MonacoDetail
        value={data}
        language={language}
        theme={theme}
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}

export default MonacoPanel;
