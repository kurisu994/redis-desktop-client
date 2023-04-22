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
}

const KeyDetail = (props: Props) => {
  const { keyType, value, theme } = props;

  const TypeDetails: any = {
    [RedisKeyType.ZSET]: <ZSetDetails value={[]} theme={theme} />,
    [RedisKeyType.SET]: (
      <SetDetails value={value} onSave={console.log} theme={theme} />
    ),
    [RedisKeyType.STRING]: (
      <StringDetails value={value} onSave={console.log} theme={theme} />
    ),
    [RedisKeyType.HASH]: <HashDetails value={[]} theme={theme} />,
    [RedisKeyType.LIST]: <ListDetails value={value} theme={theme} />,
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
