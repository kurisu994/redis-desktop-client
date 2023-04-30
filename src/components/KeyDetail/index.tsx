import { RedisKeyType, UnresolvedKeyTypes } from '@/typing/global';
import ZSetDetails from './Details/ZSetDetails';
import SetDetails from './Details/SetDetails';
import StringDetails from './Details/StringDetails';
import HashDetails from './Details/HashDetails';
import ListDetails from './Details/ListDetails';
import UnsupportedTypeDetails from './Details/UnsupportedTypeDetails';
import st from './index.module.css';

export interface Props {
  keyType?: RedisKeyType;
  value?: any;
  theme: 'vs-dark' | 'light';
  onSave?: (value: any) => void;
}

const KeyDetail = ({ keyType, value, theme, onSave }: Props) => {
  const TypeDetails: any = {
    [RedisKeyType.ZSET]: (
      <ZSetDetails value={value} onSave={console.log} theme={theme} />
    ),
    [RedisKeyType.SET]: (
      <SetDetails value={value} onSave={console.log} theme={theme} />
    ),
    [RedisKeyType.STRING]: (
      <StringDetails
        value={value}
        onSave={(val) => onSave?.(val)}
        theme={theme}
      />
    ),
    [RedisKeyType.HASH]: (
      <HashDetails value={value} onSave={console.log} theme={theme} />
    ),
    [RedisKeyType.LIST]: (
      <ListDetails value={value} onSave={console.log} theme={theme} />
    ),
  };

  return (
    <div className={st['detail-wrapper']}>
      {keyType && keyType in TypeDetails && TypeDetails[keyType]}

      {(!keyType || UnresolvedKeyTypes.includes(keyType)) && (
        <UnsupportedTypeDetails />
      )}
    </div>
  );
};

export default KeyDetail;
