import { useMemo } from 'react';
import { Button, Table, TableColumnProps } from '@arco-design/web-react';
import { useSafeState } from 'ahooks';
import st from './index.module.less';
import MonacoPanel from '@/components/MonacoPanel';
interface Props {
  value: string[];
  onSave?: (value: string) => unknown;
  theme: 'vs-dark' | 'light';
}

function ListDetails({ value = [], theme }: Props) {
  const [index, setIndex] = useSafeState<number>();
  const [rowValue, setRowValue] = useSafeState<string>('');

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

  const dataSource = useMemo(
    () => value.map((t, i) => ({ id: i + 1, value: t })),
    [value]
  );

  const handleChange = (val = '') => {
    console.log(val);
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
            pagination={{ pageSize: 5, simple: true, size: 'mini' }}
            stripe
            onRow={(record, index) => {
              return {
                onClick: (_) => {
                  setIndex(index);
                  setRowValue(record.value);
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

      <MonacoPanel value={rowValue} theme={theme} onChange={handleChange} />
    </div>
  );
}

export default ListDetails;
