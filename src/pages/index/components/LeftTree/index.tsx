import { useCallback, useEffect, useState } from 'react';
import { Tree } from '@arco-design/web-react';
import {
  NodeInstance,
  NodeProps,
  TreeDataType,
} from '@arco-design/web-react/es/Tree/interface';
import st from './index.module.css';
import { Data, DeleteFive, Redo } from '@icon-park/react';
import { Connection } from '../../api';
import { IconDesktop } from '@arco-design/web-react/icon';
import ServerBtnGroup from './ServerBtnGroup';

interface Props {
  servers: Connection[];
  onEdit?: (id?: number) => unknown;
  onRemove?: (id?: number) => unknown;
}

export enum Intent {
  REFRESH,
  UNCONNECT,
  COPY,
  EDIT,
  REMOVE,
}

function LeftContent({ servers, onEdit, onRemove }: Props) {
  const [treeData, setTreeData] = useState<TreeDataType[]>();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  useEffect(() => {
    setTreeData(servers.map((item) => ({ ...item, icon: <IconDesktop /> })));
  }, [servers]);
  const extraRender = useCallback(
    (node: NodeProps) => {
      if (!node?.selected) {
        return null;
      }
      if (!node.parentKey) {
        const { id } = node.dataRef || {};
        return (
          <ServerBtnGroup
            onIntent={(int) => {
              switch (int) {
                case Intent.REFRESH:
                  break;
                case Intent.UNCONNECT:
                  break;
                case Intent.COPY:
                  break;
                case Intent.EDIT:
                  onEdit?.(id);
                  break;
                case Intent.REMOVE:
                  onRemove?.(id);
                  break;
                default:
                  break;
              }
            }}
          />
        );
      }
      if (node._level == 1) {
        return (
          <Redo
            theme="outline"
            className={st['children-node-icon']}
            size="18"
            strokeWidth={3}
            strokeLinecap="butt"
          />
        );
      }
      if (!node.isLeaf) {
        return (
          <>
            <Redo
              theme="outline"
              className={st['children-node-icon']}
              size="18"
              strokeWidth={3}
              strokeLinecap="butt"
            />
            <DeleteFive
              theme="outline"
              className={st['children-node-icon']}
              size="18"
              strokeWidth={3}
              strokeLinecap="butt"
            />
          </>
        );
      }
      return null;
    },
    [onEdit, onRemove]
  );

  const handSelect = (selectedKeys: string[]) => {
    console.log(selectedKeys);
    setSelectedKeys(selectedKeys);
  };

  const loadMore = (treeNode: NodeInstance): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!treeNode.props.dataRef) {
          return resolve();
        }
        const dbs = [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        ];
        treeNode.props.dataRef.children = dbs.map((t) => ({
          name: `db${t}`,
          id: `${treeNode.props._key}-${t}`,
          isLeaf: false,
          icon: (
            <Data
              theme="outline"
              size="14"
              strokeWidth={3}
              strokeLinecap="butt"
            />
          ),
        }));
        setTreeData([...(treeData || [])]);
        if (treeNode.props._key) {
          setExpandedKeys([...expandedKeys, treeNode.props._key]);
        }
        resolve();
      }, 1000);
    });
  };

  return (
    <Tree
      size="large"
      blockNode
      actionOnClick={['select']}
      selectedKeys={selectedKeys}
      onSelect={handSelect}
      virtualListProps={{ height: '100%' }}
      // expandedKeys={expandedKeys}
      // onExpand={onDoubleClick}
      fieldNames={{
        key: 'id',
        title: 'name',
        children: 'children',
      }}
      loadMore={loadMore}
      treeData={treeData}
      renderExtra={extraRender}
    />
  );
}

export default LeftContent;
