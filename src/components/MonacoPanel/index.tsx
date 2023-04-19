import { useMemo, useState } from 'react';
import MonacoDetail from '../MonacoDetail';
import st from './index.module.less';
import { Button, Input, Select } from '@arco-design/web-react';
import styles from './index.module.less';
import EditorOption from '@/components/EditorOption';

interface Props {
  value?: string;
  theme: 'vs-dark' | 'light';
  onChange?: (value?: string) => unknown;
  className?: string;
}
function MonacoPanel({ value, theme, onChange }: Props) {
  const [language, setLanguage] = useState<string>('plaintext');
  const languages = useMemo(() => ['plaintext', 'json', 'markdown'], []);

  return (
    <div className={st.editor}>
      <EditorOption
        size={new Blob([value ?? '']).size}
        language={language}
        languages={languages}
        changeLanguage={(v) => setLanguage(v)}
      />
      <MonacoDetail
        value={value}
        language={language}
        theme={theme}
        onChange={onChange}
      />
    </div>
  );
}

export default MonacoPanel;
