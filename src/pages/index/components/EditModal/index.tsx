import { useState } from 'react';
import { Button, Form, Grid, Modal, Spin, Tabs } from '@arco-design/web-react';
import ConBaseForm from './ConBaseForm';
import AdvancedForm from './AdvancedForm';
import { SaveParams } from '../../api';

import st from './index.module.css';

const Row = Grid.Row;
const Col = Grid.Col;

interface Props {
  visible?: boolean;
  loading?: boolean;
  onOk?: (data: SaveParams) => unknown;
  onCancel?: () => unknown;
}

const TabPane = Tabs.TabPane;
function EditModal({ visible, loading, onOk, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState('1');
  const [form] = Form.useForm();

  const _onCancel = () => {
    onCancel?.();
  };

  const onSubmit = (v: { [key: string]: unknown }) => {
    console.log(v);
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
      afterClose={() => form.resetFields()}
      autoFocus={false}
      closable={false}
      focusLock={true}
      footer={
        <Row>
          <Col flex={'100px'}>
            <Button disabled={loading} onClick={() => onCancel?.()}>
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
