export function getSplitPath(path: string) {
  return path.split('/').filter(path => path !== '');
}
