import React, { useMemo } from 'react';
import { Button, Table, TableColumnProps } from '@arco-design/web-react';
import { useSafeState } from 'ahooks';
import MonacoPanel from '@/components/MonacoPanel';
import st from './index.module.less';
import { isObject } from '@/utils/is';

interface Props {
  value?: { [key: string]: any };
  onSave?: (value: string, row_key: string) => unknown;
  theme: 'vs-dark' | 'light';
}

type IRowValue = {
  value?: string;
  row_key: string;
  id?: number;
};

function HashDetails({ value = {}, theme, onSave }: Props) {
  console.log(value);
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
        title: 'key',
        dataIndex: 'row_key',
        align: 'center',
        ellipsis: true,
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
    return Object.keys(value).map((key, index) => ({
      id: index + 1,
      row_key: key,
      value: value?.[key] ?? '',
    }));
  }, [value]);

  const handSave = (value: string) => {
    onSave?.(value, rowValue?.row_key ?? '');
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

      <MonacoPanel
        value={rowValue?.value}
        theme={theme}
        onSave={handSave}
        disabled={!rowValue}
      />
    </div>
  );
}

export default React.memo(HashDetails);
