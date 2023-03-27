import { useState } from 'react';
import { Button, Layout } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import LeftTree from './components/LeftTree';
import RightContent from './components/RightContent';
import { useRequest } from 'ahooks';
import { getConList } from './api';

import './index.css';

const Sider = Layout.Sider;

export default function Index() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { loading, data, run } = useRequest(getConList);

  const handleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Layout className="layout-collapse-mangguo">
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        collapsedWidth={0}
        style={{
          maxWidth: '60%',
        }}
        resizeDirections={['right']}
        breakpoint="xl"
        width="25%"
      >
        <Button long icon={<IconPlus />}>
          添加
        </Button>
        {data?.map((con) => (
          <LeftTree
            key={con.id}
            ip={con.host}
            port={con.port}
            alias={con.name}
          />
        ))}
      </Sider>
      <RightContent
        siderCollapsed={collapsed}
        handlerSiderCollapse={handleCollapsed}
      />
    </Layout>
  );
}
