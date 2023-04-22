import MonacoPanel from '@/components/MonacoPanel';
import React from 'react';
interface Props {
  value?: string;
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function StringDetails({ value, onSave, theme }: Props) {
  return <MonacoPanel value={value} theme={theme} onSave={onSave} />;
}

export default React.memo(StringDetails);
