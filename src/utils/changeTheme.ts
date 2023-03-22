export type Theme = 'light' | 'dark' | 'auto';

function changeTheme(theme: Theme) {
  if (theme === 'dark') {
    document.body.setAttribute('arco-theme', 'dark');
  } else {
    document.body.removeAttribute('arco-theme');
  }
}

export default changeTheme;
