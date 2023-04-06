import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Grid,
  Message,
  Modal,
  Spin,
  Tabs,
} from '@arco-design/web-react';
import ConBaseForm from './ConBaseForm';
import AdvancedForm from './AdvancedForm';
import { SaveParams, Connection, testCon } from '../../api';

import st from './index.module.css';
import { useRequest } from 'ahooks';

const Row = Grid.Row;
const Col = Grid.Col;

interface Props {
  visible?: boolean;
  data?: Connection;
  loading?: boolean;
  onOk?: (data: SaveParams) => unknown;
  onCancel?: () => unknown;
}

const TabPane = Tabs.TabPane;
function EditModal({ visible, data, loading, onOk, onCancel }: Props) {
  const { run, loading: testing } = useRequest(testCon, {
    manual: true,
    onSuccess: () => {
      Message.success('Successful connection to redis-server');
    },
    onError: (e) => {
      Message.error(e.message);
    },
  });

  const [activeTab, setActiveTab] = useState('1');
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible && data) {
      form.setFieldsValue({
        ...data,
        securityType: `${data?.securityType ?? ''}`,
      });
    }
  }, [data, form, visible]);

  const handTestCon = () => {
    const _data = form.getFieldsValue([
      'host',
      'port',
      'password',
      'username',
      'conTimeout',
      'executionTimeout',
    ]);
    run({
      ..._data,
      username:
        typeof _data.username == 'string' && _data.username.trim() == ''
          ? undefined
          : _data.username,
      password:
        typeof _data.password == 'string' && _data.password.trim() == ''
          ? undefined
          : _data.password,
    } as never);
  };

  const _onCancel = () => {
    onCancel?.();
  };

  const onSubmit = (v: { [key: string]: unknown }) => {
    const params = {
      ...v,
      securityType: Number(v.securityType),
    } as SaveParams;
    onOk?.(params);
  };

  return (
    <Modal
      title="新建连接设置"
      visible={visible}
      mountOnEnter={false}
      className={st['modal-wrapper']}
      afterClose={() => {
        form.resetFields();
        setActiveTab('1');
      }}
      autoFocus={false}
      closable={false}
      focusLock={true}
      footer={
        <Row>
          <Col flex={'100px'}>
            <Button disabled={loading || testing} onClick={handTestCon}>
              测试连接
            </Button>
          </Col>
          <Col flex={'auto'}>
            <Button
              disabled={loading}
              type="primary"
              onClick={() => form.submit()}
            >
              确定
            </Button>
            <Button
              disabled={loading}
              style={{ marginLeft: 15 }}
              onClick={_onCancel}
            >
              取消
            </Button>
          </Col>
        </Row>
      }
    >
      <Spin tip="Save Data..." loading={loading}>
        <Form
          form={form}
          labelCol={{ span: 3, offset: 1 }}
          autoComplete="off"
          layout="horizontal"
          labelAlign="left"
          requiredSymbol={{ position: 'end' }}
          colon
          onSubmit={onSubmit}
        >
          <Tabs activeTab={activeTab} lazyload={false} onChange={setActiveTab}>
            <TabPane key="1" title="连接设置" className={st.tabpane}>
              <ConBaseForm />
            </TabPane>
            <TabPane key="2" title="高级设置" className={st.tabpane}>
              <AdvancedForm />
            </TabPane>
          </Tabs>
        </Form>
      </Spin>
    </Modal>
  );
}

export default EditModal;
