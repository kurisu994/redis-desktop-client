import React from 'react';
import st from './index.module.less';

function UnsupportedTypeDetails() {
  return (
    <div className={st.wrappers}>
      <p>UnsupportedTypeDetails</p>
    </div>
  );
}

export default React.memo(UnsupportedTypeDetails);
