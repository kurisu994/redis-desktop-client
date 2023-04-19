import { useMemo, useState } from 'react';
import MonacoPanel from '@/components/MonacoPanel';
import { Button, Select } from '@arco-design/web-react';
import st from './index.module.css';

interface Props {
  value?: string;
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function StringDetails({ value, onSave, theme }: Props) {
  const [data, setData] = useState<string>(value || '');

  const handleChange = (val = '') => {
    setData(val);
  };
  return (
    <MonacoPanel
      value={data}
      className={st['monaco-panel']}
      theme={theme}
      onChange={handleChange}
    />
  );
}

export default StringDetails;
