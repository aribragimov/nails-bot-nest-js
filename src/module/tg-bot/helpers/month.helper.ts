export function getMonthName(month: number): string {
  const map: { [key: number]: string } = {
    1: 'Январь',
    2: 'Февраль',
    3: 'Март',
    4: 'Апрель',
    5: 'Май',
    6: 'Июнь',
    7: 'Июль',
    8: 'Август',
    9: 'Сентябрь',
    10: 'Октябрь',
    11: 'Ноябрь',
    12: 'Декабрь',
  };

  if (month < 1 || month > 12) {
    return 'Некорректный месяц';
  }

  return map[month];
}

export function getMonthsNamesWithActualMonth(month: number) {
  const months = Array.from(Array(12)).slice(month - 1);

  return months.map((_, i) => ({
    number: i + month,
    name: getMonthName(i + month),
  }));
}

export function splitMonthsOnYear(allMonths: { text: string; callback_data: string }[]) {
  const splitMonths: { text: string; callback_data: string }[][] = [];

  Array.from(Array(4)).forEach((_, i) => {
    const index = i * 3;
    splitMonths.push(allMonths.slice(index, index + 3));
  });

  return splitMonths;
}
