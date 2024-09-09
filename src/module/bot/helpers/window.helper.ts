export function splitWindowsOnDay(allWindows: { text: string; callback_data: string }[]) {
  const splitWindows: { text: string; callback_data: string }[][] = [];

  Array.from(Array(5)).forEach((_, i) => {
    const index = i * 7;
    splitWindows.push(allWindows.slice(index, index + 7));
  });

  return splitWindows.filter(arr => arr.length !== 0);
}
