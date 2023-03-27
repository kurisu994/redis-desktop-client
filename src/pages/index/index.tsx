import { useState } from 'react';
import { Button, Layout, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import LeftTree from './components/LeftTree';
import RightContent from './components/RightContent';
import EditModal from './components/EditModal';
import { useRequest } from 'ahooks';
import { getConList, saveCon, SaveParams } from './api';

import './index.css';

const Sider = Layout.Sider;

export default function Index() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const { data, run } = useRequest(getConList);
  const { loading: saveLoading, run: save } = useRequest(saveCon, {
    manual: true,
    onSuccess: () => {
      Message.success('success');
      run();
    },
    onError: (e, _) => {
      Message.error(e.message);
    },
  });

  const handleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const handleSave = (data: SaveParams) => {
    save({
      ...data,
      username: '',
      password: '',
      cluster: 0,
      nodes: '',
      usePrivateKey: 0,
      sshUsername: '',
      sshHost: '',
      sshPort: 22,
      sshPassword: '',
      privateKeyPath: '',
    });
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
        <Button long icon={<IconPlus />} onClick={() => setVisible(true)}>
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
      <EditModal
        visible={visible}
        loading={saveLoading}
        onCancel={() => setVisible(false)}
        onOk={handleSave}
      />
    </Layout>
  );
}
