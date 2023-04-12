import { Theme } from '@/typing/global';

function changeTheme(theme: Theme = Theme.AUTO) {
  if (theme === Theme.DARK) {
    document.body.setAttribute('arco-theme', 'dark');
  } else {
    document.body.removeAttribute('arco-theme');
  }
}

export default changeTheme;
