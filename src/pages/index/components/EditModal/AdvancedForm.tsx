import {
  Form,
  Grid,
  Input,
  InputNumber,
  Typography,
} from '@arco-design/web-react';

const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;

function AdvancedForm() {
  return (
    <>
      <Row>
        <Col span={3}>
          <Typography.Title
            heading={6}
            style={{ marginTop: 0, marginBottom: 15 }}
          >
            键加载
          </Typography.Title>
        </Col>
        <Col />
      </Row>
      <FormItem
        field="keyFilter"
        label="默认过滤"
        wrapperCol={{ span: 18 }}
        labelCol={{ span: 5 }}
        initialValue="*"
      >
        <Input placeholder="*" />
      </FormItem>
      <FormItem
        field="delimiter"
        label="命名空间分隔符"
        wrapperCol={{ span: 18 }}
        labelCol={{ span: 5 }}
        initialValue=":"
      >
        <Input placeholder=":" />
      </FormItem>
      <Row>
        <Col span={4}>
          <Typography.Title
            heading={6}
            style={{ marginTop: 0, marginBottom: 15 }}
          >
            超时设置
          </Typography.Title>
        </Col>
        <Col />
      </Row>
      <FormItem
        field="conTimeout"
        label="连接超时(秒)"
        wrapperCol={{ span: 18 }}
        labelCol={{ span: 5 }}
        initialValue="10"
      >
        <InputNumber mode="button" min={0} />
      </FormItem>
      <FormItem
        field="executionTimeout"
        label="执行超时(秒)"
        wrapperCol={{ span: 18 }}
        labelCol={{ span: 5 }}
        initialValue="10"
      >
        <InputNumber mode="button" min={0} />
      </FormItem>
    </>
  );
}

export default AdvancedForm;
