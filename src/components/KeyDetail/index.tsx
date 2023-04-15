import React, { useEffect } from 'react';
import { RedisKeyType, UnresolvedKeyTypes } from '@/typing/global';
import ZSetDetails from './Details/ZSetDetails';
import SetDetails from './Details/SetDetails';
import StringDetails from './Details/StringDetails';
import HashDetails from './Details/HashDetails';
import ListDetails from './Details/ListDetails';
import UnsupportedTypeDetails from './Details/UnsupportedTypeDetails';

export interface Props {
  keyType?: RedisKeyType;
  value?: any;
  theme: 'vs-dark' | 'light';
}

const KeyDetail = (props: Props) => {
  const { keyType, value, theme } = props;

  const TypeDetails: any = {
    [RedisKeyType.ZSET]: <ZSetDetails />,
    [RedisKeyType.SET]: <SetDetails />,
    [RedisKeyType.STRING]: <StringDetails value={value} />,
    [RedisKeyType.HASH]: <HashDetails />,
    [RedisKeyType.LIST]: <ListDetails />,
  };

  return (
    <div className="flex-column" style={{ flex: '1', height: '100%' }}>
      {keyType && keyType in TypeDetails && TypeDetails[keyType]}

      {(!keyType || UnresolvedKeyTypes.includes(keyType)) && (
        <UnsupportedTypeDetails />
      )}
    </div>
  );
};

export default React.memo(KeyDetail);
