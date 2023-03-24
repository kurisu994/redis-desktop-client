import { useState } from 'react';
import { Button, Layout } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { invoke } from '@tauri-apps/api/tauri';
import LeftTree from './components/LeftTree';
import RightContent from './components/RightContent';

import './index.css';

const Sider = Layout.Sider;

export default function Index() {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  async function addCon() {
    const data = JSON.stringify({
      name: 'dev',
      host: '127.0.0.1',
      port: 6379,
    });
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    console.info(await invoke('save', { data }));
  }

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
        <Button long icon={<IconPlus />} onClick={addCon}>
          添加
        </Button>
        <LeftTree ip="192.168.0.8" port={6379} alias="dev" />
      </Sider>
      <RightContent
        siderCollapsed={collapsed}
        handlerSiderCollapse={handleCollapsed}
      />
    </Layout>
  );
}
