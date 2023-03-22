import { useState } from 'react';
import { Tree } from '@arco-design/web-react';
import { IconFolder, IconStorage } from '@arco-design/web-react/icon';
import { NodeInstance } from '@arco-design/web-react/es/Tree/interface';
import st from './index.module.css';
import { KeyOne } from '@icon-park/react';

const TreeNode = Tree.Node;

interface Props {
  ip: string;
  port: number;
  alias: string;
}

function LeftContent({ ip, port, alias }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const onDoubleClick = (
    keys: string[],
    extra?: {
      expanded: boolean;
      node: NodeInstance;
      expandedNodes: NodeInstance[];
    }
  ) => {
    setExpandedKeys(keys);
  };
  return (
    <Tree
      size="large"
      actionOnClick={['expand']}
      expandedKeys={expandedKeys}
      onExpand={onDoubleClick}
    >
      <TreeNode
        key={`${ip}:${port}`}
        className={st['tree-node']}
        icon={<IconStorage />}
        icons={{
          switcherIcon: null,
        }}
        title={alias ?? `${ip}:${port}`}
      >
        <TreeNode
          icon={<IconFolder />}
          key="node2"
          title="db0"
          className={st['tree-node']}
        >
          <TreeNode
            icon={<KeyOne theme="outline" size="18" fill="#333" />}
            key="node2-1"
            title="setting:xxx"
            className={st['tree-node']}
          />
        </TreeNode>
        <TreeNode
          icon={<IconFolder />}
          key="node1-1"
          className={st['tree-node']}
          title="db1"
        >
          <TreeNode
            icon={<KeyOne theme="outline" size="18" fill="#333" />}
            key="node1-2"
            className={st['tree-node']}
            title="start:xxx"
          />
        </TreeNode>
      </TreeNode>
    </Tree>
  );
}

export default LeftContent;
