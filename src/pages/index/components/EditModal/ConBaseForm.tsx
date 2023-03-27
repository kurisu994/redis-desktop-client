import {
  Form,
  Grid,
  Input,
  InputNumber,
  Radio,
  Typography,
} from '@arco-design/web-react';

import st from './index.module.css';

const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;

function ConBaseForm() {
  return (
    <>
      <FormItem field="id" label="id" hidden>
        <Input />
      </FormItem>
      <FormItem field="name" label="名称" rules={[{ required: true }]}>
        <Input placeholder="连接别名" />
      </FormItem>
      <Form.Item label="地址" required style={{ marginBottom: 0 }}>
        <Row>
          <Col flex={'auto'}>
            <Form.Item field="host" rules={[{ required: true }]}>
              <Input placeholder="Redis 服务器地址" />
            </Form.Item>
          </Col>
          <Col flex="2px">
            <div className={st.colon}>:</div>
          </Col>
          <Col flex="150px">
            <Form.Item
              field="port"
              initialValue={6379}
              rules={[{ required: true }]}
            >
              <InputNumber mode="button" min={1} max={65535} />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>
      <FormItem field="password" label="密码">
        <Input placeholder="(可选) Redis 服务器验证密码" />
      </FormItem>
      <FormItem field="username" label="用户名">
        <Input placeholder="(可选) 服务器认证用户名 (redis>6.0)" />
      </FormItem>
      <Row>
        <Col span={5}>
          <Typography.Title heading={6} style={{ textAlign: 'center' }}>
            安全
          </Typography.Title>
        </Col>
        <Col />
      </Row>
      <FormItem
        colon={false}
        label={<div />}
        field="securityType"
        initialValue={'0'}
      >
        <Radio.Group>
          <Radio value={'0'}>无</Radio>
          <Radio value={'1'}>SSL/TLS</Radio>
          <Radio value={'2'}>SSH隧道</Radio>
        </Radio.Group>
      </FormItem>
    </>
  );
}

export default ConBaseForm;
