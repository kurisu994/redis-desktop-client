interface Props {
  value?: string;
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function SetDetails({}: Props) {
  return <div>SetDetails</div>;
}

export default SetDetails;
