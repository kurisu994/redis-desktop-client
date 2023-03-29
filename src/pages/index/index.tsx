import { useState } from 'react';
import { Button, Layout, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import LeftTree from './components/LeftTree';
import RightContent from './components/RightContent';
import EditModal from './components/EditModal';
import { useRequest } from 'ahooks';
import { getConList, saveCon, SaveParams, Connection } from './api';

import './index.less';

const Sider = Layout.Sider;

const defaulttree = [
  {
    id: 1,
    host: '127.0.0.1',
    port: 6379,
    name: 'dev',
  } as Connection,
];

export default function Index() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [connection, setConnection] = useState<Connection>();
  const { data = defaulttree, run } = useRequest(getConList, {
    manual: true,
  });
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

  const onEditCon = (_connection: Connection) => {
    setConnection(_connection);
    setVisible(true);
  };
  const handSave = (item: SaveParams) => {
    save(item);
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
        <Button
          long
          type="secondary"
          icon={<IconPlus />}
          onClick={() => setVisible(true)}
        >
          添加新连接
        </Button>
        {data?.map((con) => (
          <LeftTree
            key={con.id}
            host={con.host}
            port={con.port}
            alias={con.name}
            onEdit={() => onEditCon(con)}
          />
        ))}
      </Sider>
      <RightContent
        siderCollapsed={collapsed}
        handlerSiderCollapse={handleCollapsed}
      />
      <EditModal
        visible={visible}
        data={connection}
        loading={saveLoading}
        onCancel={() => setVisible(false)}
        onOk={(item) => handSave(item)}
      />
    </Layout>
  );
}
