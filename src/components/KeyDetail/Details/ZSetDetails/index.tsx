import React, { useMemo } from 'react';
import {
  Button,
  InputNumber,
  Table,
  TableColumnProps,
} from '@arco-design/web-react';
import { useSafeState } from 'ahooks';
import MonacoPanel from '@/components/MonacoPanel';
import st from './index.module.less';
import { isObject } from '@/utils/is';

interface Props {
  value?: { [key: string]: any };
  onSave?: (value: string, rate: number) => unknown;
  theme: 'vs-dark' | 'light';
}

type IRowValue = {
  value?: string;
  rate: number;
  id?: number;
};

function ZSetDetails({ value = {}, theme, onSave }: Props) {
  const [_, setIndex] = useSafeState<number>();
  const [rowValue, setRowValue] = useSafeState<IRowValue>();
  const columns: TableColumnProps[] = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'id',
        align: 'center',
        width: 80,
      },
      {
        title: 'value',
        dataIndex: 'value',
        align: 'center',
        ellipsis: true,
      },
    ],
    []
  );
  const dataSource: IRowValue[] = useMemo(() => {
    if (!isObject(value)) {
      return [];
    }
    return Object.keys(value)
      .map((key) => ({ value: key, rate: value?.[key] ?? 0 }))
      .sort((a, b) => a.rate - b.rate)
      .map((item, index) => ({ ...item, id: index + 1 }));
  }, [value]);

  const handSave = (value: string) => {
    onSave?.(value, rowValue?.rate ?? 0);
  };

  return (
    <div className={st['detail-wrapper']}>
      <div className={st.wrapper}>
        <div className={st.table}>
          <Table
            columns={columns}
            data={dataSource}
            borderCell
            rowKey="id"
            pagination={{
              pageSize: 5,
              simple: true,
              size: 'mini',
              hideOnSinglePage: true,
            }}
            stripe
            onRow={(record, index) => {
              return {
                onClick: () => {
                  setIndex(index);
                  setRowValue(record);
                },
              };
            }}
          />
        </div>
        <div className={st.options}>
          <Button className={st.btn}>add row</Button>
          <Button className={st.btn}>delete row</Button>
          <Button className={st.btn}>reload row</Button>
        </div>
      </div>
      <div className={st['source-wrapper']}>
        <span className={st['text']}>Score:</span>
        <InputNumber
          value={rowValue?.rate}
          className={st['input']}
          disabled={!rowValue}
          onChange={(val: number) => setRowValue({ ...rowValue, rate: val })}
        />
      </div>
      <MonacoPanel
        value={rowValue?.value}
        theme={theme}
        onSave={handSave}
        disabled={!rowValue}
      />
    </div>
  );
}

export default React.memo(ZSetDetails);
