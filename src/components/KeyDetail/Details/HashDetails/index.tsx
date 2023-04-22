import React from 'react';

interface Props {
  value: string[];
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function HashDetails({}: Props) {
  return <div>HashDetails</div>;
}

export default React.memo(HashDetails);
