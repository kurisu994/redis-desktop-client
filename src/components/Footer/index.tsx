import { Layout } from '@arco-design/web-react';
import { FooterProps } from '@arco-design/web-react/es/Layout/interface';
import cs from 'clsx';
import st from './index.module.less';

function Footer(props: FooterProps = {}) {
  const { className, ...restProps } = props;
  return (
    <Layout.Footer className={cs(st.footer, className)} {...restProps}>
      Kurisu
    </Layout.Footer>
  );
}

export default Footer;
