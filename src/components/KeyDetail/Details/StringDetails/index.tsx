import { useMemo, useState } from 'react';
import MonacoPanel from '@/components/MonacoPanel';
import { Button, Select } from '@arco-design/web-react';
import st from './index.module.css';

export interface Props {
  value?: string;
  onSave?: (value: string) => unknown;
}

function StringDetails({ value, onSave }: Props) {
  const [language, setLanguage] = useState<string>('plaintext');
  const [data, setData] = useState<string>(value || '');
  const languages = useMemo(() => ['plaintext', 'json', 'markdown'], []);

  const handleChange = (val = '') => {
    setData(val);
  };
  return (
    <>
      <div className={st.option}>
        <div>View as</div>
        <Select
          style={{ width: 160 }}
          value={language}
          onChange={(v) => setLanguage(v)}
          options={languages}
        />
        <Button className={st.btn} onClick={() => onSave?.(data)}>
          save
        </Button>
      </div>
      <MonacoPanel
        value={data}
        className={st['monaco-panel']}
        language={language}
        theme="vs-dark"
        onChange={handleChange}
      />
    </>
  );
}

export default StringDetails;
