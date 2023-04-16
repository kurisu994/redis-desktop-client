import { useMemo } from 'react';
import {
  Button,
  Select,
  Table,
  TableColumnProps,
} from '@arco-design/web-react';
import { useSafeState } from 'ahooks';
import st from './index.module.less';
import MonacoPanel from '@/components/MonacoPanel';

interface Props {
  value: string[];
}
function ListDetails({ value = [] }: Props) {
  const [index, setIndex] = useSafeState<number>();
  const [rowValue, setRowValue] = useSafeState<string>('');

  const [language, setLanguage] = useSafeState<string>('plaintext');
  const languages = useMemo(() => ['plaintext', 'json', 'markdown'], []);

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
    <div style={{ height: '100%' }}>
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

      <div className={st.editor}>
        <div className={st.option}>
          <div>View as</div>
          <Select
            style={{ width: 160 }}
            value={language}
            onChange={(v) => setLanguage(v)}
            options={languages}
          />
          <Button className={st.btn}>save</Button>
        </div>
        <MonacoPanel
          className={st['monaco-panel']}
          value={rowValue}
          language={language}
          theme="vs-dark"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export default ListDetails;
