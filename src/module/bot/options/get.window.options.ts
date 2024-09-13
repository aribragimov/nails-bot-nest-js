import { botCommands } from '../constants';

export const getWindowMainOptions = [
  { callback_data: botCommands.win.get.today, text: 'На сегодня' },
  { callback_data: botCommands.win.get.week, text: 'На этой неделе' },
  { callback_data: botCommands.win.get.nextWeek, text: 'На следующей неделе' },
  { callback_data: botCommands.win.get.month, text: 'В этом месяц' },
  { callback_data: botCommands.win.get.all, text: 'Все' },
];
