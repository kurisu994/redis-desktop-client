interface Props {
  value: string[];
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function ZSetDetails({}: Props) {
  return <div>ZSetDetails</div>;
}

export default ZSetDetails;
