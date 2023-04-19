import MonacoPanel from '@/components/MonacoPanel';
interface Props {
  value?: string;
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function StringDetails({ value, onSave, theme }: Props) {
  return <MonacoPanel value={value} theme={theme} onSave={onSave} />;
}

export default StringDetails;
