import { Layout, Button } from '@arco-design/web-react';
import { IconMenuUnfold, IconMenuFold } from '@arco-design/web-react/icon';
import st from './index.module.css';

const Header = Layout.Header;
const Content = Layout.Content;

interface Props {
  siderCollapsed?: boolean;
  handlerSiderCollapse?: () => any;
}

function RightContent({ siderCollapsed, handlerSiderCollapse }: Props) {
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
        <Content className={st.content}>GUI for Redis</Content>
      </Layout>
    </Layout>
  );
}

export default RightContent;
