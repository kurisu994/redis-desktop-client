if (!/pnpm/.test(process.env.npm_execpath || '')) {
  console.warn(`\u001b[33m这个仓库需要使用 pnpm 来做依赖管理\u001b[39m`);
  console.warn(`\u001b[33m请先安装 pnpm（https://pnpm.io/zh/installation）\u001b[39m`);
  throw Error('包管理工具不正确');
}
