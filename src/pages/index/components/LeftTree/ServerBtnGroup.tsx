import { Intent } from './index';
import {
  CopyLink,
  DeleteFive,
  Redo,
  SettingTwo,
  Unlink,
} from '@icon-park/react';
import st from './index.module.css';

interface Props {
  onIntent?: (intent: Intent) => unknown;
}

function ServerBtnGroup({ onIntent }: Props) {
  return (
    <>
      <Redo
        theme="outline"
        className={st['root-node-icon']}
        size="18"
        strokeWidth={3}
        onClick={() => onIntent?.(Intent.REFRESH)}
        strokeLinecap="butt"
      />
      <Unlink
        theme="outline"
        className={st['root-node-icon']}
        size="18"
        strokeWidth={3}
        onClick={() => onIntent?.(Intent.UNCONNECT)}
        strokeLinecap="butt"
      />
      <SettingTwo
        theme="outline"
        className={st['root-node-icon']}
        size="18"
        strokeWidth={3}
        onClick={() => onIntent?.(Intent.EDIT)}
        strokeLinecap="butt"
      />
      <CopyLink
        theme="outline"
        className={st['root-node-icon']}
        size="18"
        strokeWidth={3}
        onClick={() => onIntent?.(Intent.COPY)}
        strokeLinecap="butt"
      />
      <DeleteFive
        theme="outline"
        className={st['root-node-icon']}
        size="18"
        strokeWidth={3}
        onClick={() => onIntent?.(Intent.REMOVE)}
        strokeLinecap="butt"
      />
    </>
  );
}

export default ServerBtnGroup;
