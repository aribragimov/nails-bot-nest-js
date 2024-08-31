export function splitDaysOnWeek(allDays: { text: string; callback_data: string }[]) {
  const splitDays: { text: string; callback_data: string }[][] = [];

  Array.from(Array(5)).map((_, i) => {
    const index = i * 7;
    splitDays.push(allDays.slice(index, index + 7));
  });

  return splitDays;
}
