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
  handleSiderCollapse?: () => unknown;
  refresh?: () => unknown;
  redisValue?: RedisValue;
  deleteKey?: () => unknown;
}

function RightContent({
  siderCollapsed,
  handleSiderCollapse,
  redisValue,
  refresh,
  deleteKey,
}: Props) {
  const { monacoTheme } = useContext(GlobalContext);

  const save = (value: any) => {
    console.log(value);
  };

  return (
    <Layout>
      <Header className={st.header}>
        <Button
          type="text"
          iconOnly
          className={st.trigger}
          onClick={handleSiderCollapse}
        >
          {siderCollapsed ? (
            <IconMenuUnfold className={st.icon} />
          ) : (
            <IconMenuFold className={st.icon} />
          )}
        </Button>
      </Header>
      <Content className={st.content}>
        {redisValue ? (
          <>
            <RedisKeyBar
              ttl={redisValue?.ttl}
              keyType={redisValue?.keyType}
              redisKey={redisValue?.key}
              onReload={refresh}
              onDelete={deleteKey}
            />
            <KeyDetail
              keyType={redisValue?.keyType}
              value={redisValue?.value}
              theme={monacoTheme ?? 'light'}
              onSave={save}
            />
          </>
        ) : (
          <Typography.Title className={st['content-title']}>
            GUI for Redis
          </Typography.Title>
        )}
      </Content>
      <Footer />
    </Layout>
  );
}

export default RightContent;
