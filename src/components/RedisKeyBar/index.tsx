import { useEffect, useState } from 'react';
import { Button, Typography, Input } from '@arco-design/web-react';
import st from './index.module.css';
import { RedisKeyType } from '@/typing/global';
import useCountdown from '@/hooks/useCountdown';

interface Props {
  ttl?: number;
  keyType?: number;
  redisKey?: string;
  onReload?: () => unknown;
  onDelete?: () => unknown;
}

function RedisKeyBar({
  ttl = -1,
  keyType,
  redisKey,
  onReload,
  onDelete,
}: Props) {
  const [isRunning, checkRunning] = useState(false);
  const [second, setSecond] = useState<number>(-1);

  useEffect(() => {
    if (ttl > 0) {
      setSecond(ttl);
      checkRunning(true);
    }
  }, [ttl]);

  useCountdown(
    () => {
      setSecond(second - 1);
      if (second <= 0) {
        checkRunning(false);
        setSecond(0);
      }
    },
    isRunning ? 1000 : null
  );

  const onChangeKeyName = () => {
    //TODO
  };

  const onChangeTtl = () => {
    //TODO
  };

  return (
    <div className={st['space-wrapper']}>
      <Typography.Text className={st['type-text']}>
        {(keyType && RedisKeyType[keyType]) || '-'}:
      </Typography.Text>
      <Input value={redisKey} className={st['input']} disabled />
      <Button className={st.btn} onClick={onChangeKeyName}>
        Rename
      </Button>
      <Button
        className={st.statistic}
        onClick={onChangeTtl}
      >{`TTL:${second}`}</Button>
      <Button className={st.btn} onClick={onDelete}>
        Delete
      </Button>
      <Button onClick={onReload}>Reload Value</Button>
    </div>
  );
}

export default RedisKeyBar;
