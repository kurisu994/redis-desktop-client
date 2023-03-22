import { useState } from 'react';
import { Layout } from '@arco-design/web-react';
import { invoke } from '@tauri-apps/api/tauri';
import LeftTree from './components/LeftTree';
import RightContent from './components/RightContent';
import './index.css';

const Sider = Layout.Sider;

export default function Index() {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  async function greet(name: string) {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    console.info(await invoke('greet', { name }));
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
        <div className="logo" />
        <LeftTree ip="192.168.0.8" port={6379} alias="dev" />
      </Sider>
      <RightContent
        siderCollapsed={collapsed}
        handlerSiderCollapse={handleCollapsed}
      />
    </Layout>
  );
}
