import { useMemo, useState } from 'react';
import MonacoPanel from '@/components/MonacoPanel';
import { Button, Select } from '@arco-design/web-react';
import st from './index.module.css';

export interface Props {
  value?: string;
}

function StringDetails({ value }: Props) {
  const [language, setLanguage] = useState<string>('plaintext');
  const languages = useMemo(() => ['plaintext', 'json', 'markdown'], []);
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
        <Button className={st.btn}>save</Button>
      </div>
      <MonacoPanel value={value} language={language} theme="vs-dark" />
    </>
  );
}

export default StringDetails;
