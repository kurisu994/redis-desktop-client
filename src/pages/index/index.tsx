import { useState } from 'react';
import { Button, Layout, Message, Modal } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import LeftTree from './components/LeftTree';
import RightContent from './components/RightContent';
import EditModal from './components/EditModal';
import { useRequest } from 'ahooks';
import { getConList, saveCon, SaveParams, Connection, removeCon } from './api';

import './index.less';

const Sider = Layout.Sider;

export default function Index() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [connection, setConnection] = useState<Connection>();
  const { data, run, mutate } = useRequest(getConList);
  const { loading: saveLoading, run: save } = useRequest(saveCon, {
    manual: true,
    onSuccess: () => {
      Message.success('success');
      run();
      setVisible(false);
      setConnection(undefined);
    },
    onError: (e) => {
      Message.error(e.message);
    },
  });

  const handleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const onEditCon = (id?: number) => {
    if (!id) {
      return;
    }
    const con = data?.find((t) => t.id == id);
    if (con) {
      setConnection(con);
      setVisible(true);
    }
  };

  const handSave = (item: SaveParams) => {
    save({ ...item, cluster: 0, nodes: undefined });
  };

  const handRemove = (id?: number) => {
    if (!id) {
      return;
    }
    Modal.confirm({
      icon: null,
      title: null,
      isNotice: false,
      content: 'Do you really want to delete connection?',
      onOk: async () => {
        await removeCon(id);
        mutate(data?.filter((t) => t.id != id));
      },
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
        width="30%"
      >
        <Button
          long
          type="secondary"
          className="add-btn"
          icon={<IconPlus />}
          onClick={() => setVisible(true)}
        >
          添加新连接
        </Button>
        <LeftTree
          servers={data || []}
          onEdit={(id) => onEditCon(id)}
          onRemove={(id) => handRemove(id)}
        />
      </Sider>
      <RightContent
        siderCollapsed={collapsed}
        handlerSiderCollapse={handleCollapsed}
      />
      <EditModal
        visible={visible}
        data={connection}
        loading={saveLoading}
        onCancel={() => {
          setVisible(false);
          setConnection(undefined);
        }}
        onOk={(item) => handSave(item)}
      />
    </Layout>
  );
}
