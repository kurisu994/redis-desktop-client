import { Form, Grid, Input, Typography } from '@arco-design/web-react';

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
            style={{ marginTop: 0, marginBottom: '1em' }}
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
    </>
  );
}

export default AdvancedForm;
