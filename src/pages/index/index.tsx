import { useRef, useState } from 'react';
import { Layout, Breadcrumb, Button, Tree } from '@arco-design/web-react';
import { IconCaretRight, IconCaretLeft } from '@arco-design/web-react/icon';
import {
  IconFolder,
  IconStorage,
  IconDriveFile,
} from '@arco-design/web-react/icon';
import { invoke } from '@tauri-apps/api/tauri';
import './index.css';
import { NodeInstance } from '@arco-design/web-react/es/Tree/interface';

const TreeNode = Tree.Node;
const Sider = Layout.Sider;
const Header = Layout.Header;
const Footer = Layout.Footer;
const Content = Layout.Content;

export default function Index() {
  const clickCount = useRef(0);
  const currentTime = useRef(0);
  const lastNodeKey = useRef<number | string>();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    console.info(await invoke('greet', { name }));
  }

  const handleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  const onDoubleClick = (
    keys: string[],
    extra?: {
      expanded: boolean;
      node: NodeInstance;
      expandedNodes: NodeInstance[];
    }
  ) => {
    const nodeKey = extra?.node?.key ?? '';
    console.log(keys, extra);
    if (clickCount.current++ === 1) {
      currentTime.current = new Date().valueOf();
    }
    if (clickCount.current === 2) {
      const now = new Date().valueOf();
      if (now - currentTime.current < 300 && nodeKey === lastNodeKey.current) {
        setExpandedKeys(keys);
        clickCount.current = 0;
        currentTime.current = 0;
      } else {
        clickCount.current = 1;
        currentTime.current = now;
      }
    }
    lastNodeKey.current = nodeKey;
  };

  return (
    <Layout className="layout-collapse-mangguo">
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        collapsedWidth={0}
        style={{
          maxWidth: 450,
        }}
        breakpoint="xl"
      >
        <div className="logo" />
        <Tree
          icons={{
            switcherIcon: <IconStorage />,
          }}
          size="large"
          actionOnClick="expand"
          expandedKeys={expandedKeys}
          onExpand={onDoubleClick}
        >
          <TreeNode
            key="node1"
            className="tree-node"
            icons={{
              switcherIcon: <IconStorage />,
            }}
            title="dev-redis"
          >
            <TreeNode
              icons={{
                switcherIcon: <IconFolder />,
              }}
              key="node2"
              title="db0"
              className="tree-node"
            >
              <TreeNode
                icons={{
                  switcherIcon: <IconFolder />,
                }}
                icon={<IconDriveFile />}
                key="node2-1"
                title="setting:xxx"
                className="tree-node"
              />
            </TreeNode>
            <TreeNode
              icons={{
                switcherIcon: <IconFolder />,
              }}
              key="node1-1"
              className="tree-node"
              title="db1"
            >
              <TreeNode
                icons={{
                  switcherIcon: <IconFolder />,
                }}
                icon={<IconDriveFile />}
                key="node1-2"
                className="tree-node"
                title="start:xxx"
              />
            </TreeNode>
          </TreeNode>
          <TreeNode
            key="node3"
            title="test-redis"
            className="tree-node"
            icons={{
              switcherIcon: <IconStorage />,
            }}
          >
            <TreeNode
              icons={{
                switcherIcon: <IconFolder />,
              }}
              icon={<IconDriveFile />}
              key="node4"
              title="db0"
              className="tree-node"
            />
            <TreeNode
              icons={{
                switcherIcon: <IconFolder />,
              }}
              icon={<IconDriveFile />}
              key="node5"
              title="db1"
              className="tree-node"
            />
          </TreeNode>
        </Tree>
      </Sider>
      <Layout>
        <Header>
          <Button shape="round" className="trigger" onClick={handleCollapsed}>
            {collapsed ? <IconCaretRight /> : <IconCaretLeft />}
          </Button>
        </Header>
        <Layout style={{ padding: '0 24px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>List</Breadcrumb.Item>
            <Breadcrumb.Item>App</Breadcrumb.Item>
          </Breadcrumb>
          <Content>Content</Content>
          <Footer>Footer</Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
