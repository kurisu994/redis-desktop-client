import { useCallback, useState } from 'react';
import { Tree } from '@arco-design/web-react';
import {
  IconFolder,
  IconRefresh,
  IconStorage,
} from '@arco-design/web-react/icon';
import {
  NodeInstance,
  NodeProps,
} from '@arco-design/web-react/es/Tree/interface';
import './index.css';
import {
  CopyLink,
  DeleteFive,
  KeyOne,
  Redo,
  SettingTwo,
  Unlink,
} from '@icon-park/react';

const TreeNode = Tree.Node;

interface Props {
  host: string;
  port: number;
  alias: string;
  onEdit?: () => unknown;
}

function LeftContent({ host, port, alias, onEdit }: Props) {
  const [treeData, setTreeData] = useState([
    {
      title: alias,
      key: `${host}:${port}`,
    },
  ]);

  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const extraRender = useCallback((node: NodeProps) => {
    console.log(node);
    if (!node.parentKey && node?.selected) {
      return (
        <>
          <Redo
            theme="outline"
            className="root-node-icon"
            size="18"
            strokeWidth={3}
            strokeLinecap="butt"
          />
          <Unlink
            theme="outline"
            className="root-node-icon"
            size="18"
            strokeWidth={3}
            strokeLinecap="butt"
          />
          <SettingTwo
            theme="outline"
            className="root-node-icon"
            size="18"
            strokeWidth={3}
            strokeLinecap="butt"
          />
          <CopyLink
            theme="outline"
            className="root-node-icon"
            size="18"
            strokeWidth={3}
            strokeLinecap="butt"
          />
          <DeleteFive
            theme="outline"
            className="root-node-icon"
            size="18"
            strokeWidth={3}
            strokeLinecap="butt"
          />
        </>
      );
    }
    return null;
  }, []);

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

  const loadMore = (treeNode: NodeInstance) => {
    console.log('加载更多');
  };

  return (
    <Tree
      size="large"
      blockNode
      virtualListProps={{ height: '100%' }}
      actionOnClick={['select']}
      expandedKeys={expandedKeys}
      onExpand={onDoubleClick}
      // loadMore={loadMore}
      treeData={treeData}
      renderExtra={extraRender}
    />
  );
}

export default LeftContent;
