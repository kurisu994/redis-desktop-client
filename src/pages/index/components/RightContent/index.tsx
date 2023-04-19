import { useContext } from 'react';
import { Layout, Button, Typography } from '@arco-design/web-react';
import { IconMenuUnfold, IconMenuFold } from '@arco-design/web-react/icon';
import st from './index.module.css';
import { RedisValue } from '@/pages/index/api';
import { GlobalContext } from '@/context';
import RedisKeyBar from '@/components/RedisKeyBar';
import KeyDetail from '@/components/KeyDetail';
import Footer from '@/components/Footer';

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
          {redisValue ? (
            <>
              <RedisKeyBar
                ttl={redisValue?.ttl}
                keyType={redisValue?.keyType}
                redisKey={redisValue?.key}
              />
              <KeyDetail
                keyType={redisValue?.keyType}
                value={redisValue?.value}
                theme={monacoTheme ?? 'light'}
              />
            </>
          ) : (
            <Typography.Title className={st['content-title']}>
              GUI for Redis
            </Typography.Title>
          )}
        </Content>
      </Layout>
      <Footer />
    </Layout>
  );
}

export default RightContent;
