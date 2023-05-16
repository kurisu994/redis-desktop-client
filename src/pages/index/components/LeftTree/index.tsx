import { useCallback, useEffect, useState } from 'react';
import { Message, Tree } from '@arco-design/web-react';
import {
  NodeInstance,
  NodeProps,
  TreeDataType,
} from '@arco-design/web-react/es/Tree/interface';
import st from './index.module.css';
import { Data, DeleteFive, KeyOne, Redo } from '@icon-park/react';
import { Connection } from '../../api';
import { queryDbs, queryRedisKeys } from './api';
import { IconDesktop } from '@arco-design/web-react/icon';
import ServerBtnGroup from './ServerBtnGroup';
import { constructKeysToTree } from '@/utils/constructKeysToTree';

interface Props {
  server: Connection;
  onEdit?: (id?: number) => unknown;
  onRemove?: (id?: number) => unknown;
  onCopy?: (id?: number) => unknown;
  onSelectKey?: (dbIndex: number, key: string) => unknown;
}

export enum Intent {
  REFRESH,
  UNCONNECT,
  COPY,
  EDIT,
  REMOVE,
}

function LeftContent({ server, onEdit, onRemove, onCopy, onSelectKey }: Props) {
  const [treeData, setTreeData] = useState<TreeDataType[]>();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  useEffect(() => {
    setTreeData([
      {
        ...server,
        isServer: true,
        icon: <IconDesktop />,
      },
    ]);
  }, [server]);

  const extraRender = useCallback(
    (node: NodeProps) => {
      if (!node?.selected) {
        return null;
      }
      if (!node.parentKey) {
        return (
          <ServerBtnGroup
            onIntent={(int) => {
              switch (int) {
                case Intent.REFRESH:
                  break;
                case Intent.UNCONNECT:
                  break;
                case Intent.COPY:
                  onCopy?.(server.id);
                  break;
                case Intent.EDIT:
                  onEdit?.(server.id);
                  break;
                case Intent.REMOVE:
                  onRemove?.(server.id);
                  break;
                default:
                  break;
              }
            }}
          />
        );
      }
      if (node.selected) {
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
      }

      return null;
    },
    [server, onCopy, onEdit, onRemove]
  );

  const handSelect = (
    selectedKeys: string[],
    extra: {
      selected: boolean;
      selectedNodes: NodeInstance[];
      node: NodeInstance;
      e: Event;
    }
  ) => {
    setSelectedKeys(selectedKeys);
    if (extra.node.props.isLeaf && extra.selected) {
      // @ts-ignore  自定义的属性
      onSelectKey?.(extra.node.props.dbIndex, extra.node.props.redisKey);
    }
  };

  const loadMore = useCallback(
    async (treeNode: NodeInstance): Promise<void> => {
      if (!treeNode?.props?.dataRef) {
        return;
      }
      const { isServer, isDb, redisKey } = treeNode.props.dataRef || {};
      try {
        if (isServer) {
          const dbs = await query_db_list(server.id, treeNode.props._key);
          treeNode.props.dataRef.children = dbs;
        }
        if (isDb) {
          const keyArr = await query_db_key_list(
            server.id,
            redisKey,
            treeNode.props._key
          );
          treeNode.props.dataRef.children = keyArr;
        }
        setTreeData([...(treeData || [])]);
        if (treeNode.props._key) {
          setExpandedKeys([...expandedKeys, treeNode.props._key]);
        }
      } catch (e: any) {
        Message.error(e.message);
      }
    },
    [expandedKeys, server, treeData]
  );

  const query_db_key_list = async (
    id: number,
    db_index: number,
    cur_key?: string
  ) => {
    const res = await queryRedisKeys(id, db_index);
    console.log(constructKeysToTree({ items: res }));
    return (res || []).map((t) => ({
      name: t,
      id: `${cur_key}-${t}`,
      redisKey: t,
      isDb: false,
      isLeaf: true,
      dbIndex: db_index,
      icon: (
        <KeyOne
          theme="outline"
          size="14"
          strokeWidth={3}
          strokeLinecap="butt"
        />
      ),
    }));
  };

  const query_db_list = async (id: number, cur_key?: string) => {
    const res = await queryDbs(id);
    return (res || []).map((t) => ({
      name: `${t.name}(${t.count})`,
      id: `${cur_key}-${t.id}`,
      redisKey: t.id,
      isDb: true,
      isLeaf: false,
      icon: (
        <Data theme="outline" size="14" strokeWidth={3} strokeLinecap="butt" />
      ),
    }));
  };

  return (
    <Tree
      size="large"
      blockNode
      actionOnClick={['select']}
      selectedKeys={selectedKeys}
      onSelect={handSelect}
      fieldNames={{
        key: 'id',
        title: 'name',
        children: 'children',
      }}
      loadMore={(node) => loadMore(node)}
      treeData={treeData}
      renderExtra={extraRender}
    />
  );
}

export default LeftContent;
