import { Button, Select } from '@arco-design/web-react';
import st from './index.module.less';

interface Props {
  size: number;
  language: string;
  changeLanguage: (language: string) => unknown;
  languages: string[];
}

function EditorOption({
  size = 0,
  languages,
  language,
  changeLanguage,
}: Props) {
  return (
    <div className={st['option-wrapper']}>
      <div className={st.size}>
        <div className={st.text}> Size:</div>
        <div className={st.text}>{size} KB</div>
      </div>

      <div className={st.option}>
        <div className={st.text}>View as:</div>
        <Select
          className={st.selector}
          value={language}
          onChange={(v) => changeLanguage(v)}
          options={languages}
        />
        <Button className={st.btn}>save</Button>
      </div>
    </div>
  );
}

export default EditorOption;
