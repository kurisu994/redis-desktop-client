import { useEffect, useMemo, useState } from 'react';
import MonacoDetail from '../MonacoDetail';
import st from './index.module.less';
import EditorOption from '@/components/EditorOption';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
  onSave?: (value: string) => unknown;
}
function MonacoPanel({ value, theme, onSave }: Props) {
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
      />
      <MonacoDetail
        value={data}
        language={language}
        theme={theme}
        onChange={handleChange}
      />
    </div>
  );
}

export default MonacoPanel;
