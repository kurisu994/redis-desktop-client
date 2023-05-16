interface Props {
  items?: string[];
  delimiter?: string;
}

/**
 * keys数组转树形结构
 * @param props key相关数据
 * @returns 树形结构的keytree
 */
export const constructKeysToTree = (props: Props): any[] => {
  const { items: keys = [], delimiter = ':' } = props;
  const keysSymbol = `keys${delimiter}keys`;
  const tree: any = {};
  keys.forEach((key: any) => {
    let currentNode: any = tree;
    const keySplitted = key.split(delimiter);
    const lastIndex = keySplitted.length - 1;

    keySplitted.forEach((value: any, index: number) => {
      if (index === lastIndex) {
        if (currentNode[keysSymbol] === undefined) {
          currentNode[keysSymbol] = {};
        }
        currentNode[keysSymbol][key] = key;
      } else if (currentNode[value] === undefined) {
        currentNode[value] = {};
      }
      currentNode = currentNode[value];
    });
  });

  const ids: any = {};

  // common functions
  const getUniqueId = (): number | string => {
    const candidateId = Math.random().toString(36);

    if (ids[candidateId]) {
      return getUniqueId();
    }

    ids[candidateId] = true;
    return candidateId;
  };

  // FormatTreeData
  const formatTreeData = (tree: any, previousKey = '', delimiter = ':') => {
    const treeNodes = Reflect.ownKeys(tree);
    // sort Ungrouped Keys group to top
    treeNodes.some((key, index) => {
      if (key === keysSymbol) {
        const temp = treeNodes[0];
        treeNodes[0] = key;
        treeNodes[index] = temp;
        return true;
      }
      return false;
    });

    return treeNodes.map((key) => {
      const name = key?.toString();
      const node: any = { name };
      const tillNowKeyName = previousKey + name + delimiter;

      // populate node with children nodes
      if (key !== keysSymbol && Reflect.ownKeys(tree[key]).length > 0) {
        node.children = formatTreeData(tree[key], tillNowKeyName, delimiter);
        node.keyCount = node.children.reduce(
          (a: any, b: any) => a + (b.keyCount || 0),
          0
        );
        node.leaf = false;
      } else {
        // populate leaf with keys
        node.children = [];
        node.keys = tree[keysSymbol] ?? [];
        node.leaf = true;
        node.keyCount = Object.keys(node.keys ?? [])?.length ?? 1;
      }

      node.fullName = tillNowKeyName;
      node.keyApproximate = (node.keyCount / keys.length) * 100;
      node.id = getUniqueId();
      return node;
    });
  };

  return formatTreeData(tree, '', delimiter);
};
