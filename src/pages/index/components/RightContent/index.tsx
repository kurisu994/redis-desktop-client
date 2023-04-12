import { useContext } from 'react';
import { Layout, Button, Typography } from '@arco-design/web-react';
import { IconMenuUnfold, IconMenuFold } from '@arco-design/web-react/icon';
import st from './index.module.css';
import { RedisValue } from '@/pages/index/api';
import MonacoPanel from '@/components/MonacoPanel';
import { GlobalContext } from '@/context';
import { RedisKeyType } from '@/typing/global';
import RedisKeyBar from '@/components/RedisKeyBar';

const Header = Layout.Header;
const Content = Layout.Content;

interface Props {
  siderCollapsed?: boolean;
  handlerSiderCollapse?: () => unknown;
  redisValue?: RedisValue;
}

function RightContent({
  siderCollapsed,
  handlerSiderCollapse,
  redisValue,
}: Props) {
  const { monacoTheme } = useContext(GlobalContext);
  console.debug(redisValue);

  return (
    <Layout>
      <Header className={st.header}>
        <Button
          type="text"
          iconOnly
          className={st.trigger}
          onClick={() => handlerSiderCollapse?.()}
        >
          {siderCollapsed ? (
            <IconMenuUnfold className={st.icon} />
          ) : (
            <IconMenuFold className={st.icon} />
          )}
        </Button>
      </Header>
      <Layout className={st['content-wrapper ']}>
        <Content className={st.content}>
          <Typography.Title className={st['content-title']}>
            GUI for Redis
          </Typography.Title>
          <RedisKeyBar
            ttl={redisValue?.ttl}
            keyType={redisValue?.keyType}
            redisKey={redisValue?.key}
          />
          {redisValue && RedisKeyType.STRING == redisValue?.keyType && (
            <MonacoPanel
              value={redisValue.value}
              theme={monacoTheme ?? 'light'}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default RightContent;
