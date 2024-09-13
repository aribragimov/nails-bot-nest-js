import { botCommands } from '../constants';

export const startAdminOptions = [
  { callback_data: botCommands.win.create.main, text: 'Добавить окошки' },
  { callback_data: botCommands.win.get.main, text: 'Посмотреть окошки' },
  { callback_data: botCommands.win.update.main, text: 'Обновить окошко' },
  //TODO -  [{ callback_data: '/win/delete', text: 'Удалить окошко' }],
];

export const startUserOptions = [
  { callback_data: botCommands.win.get.main, text: 'Хочу узнать когда есть свободные окошки' },
  //TODO - [{ text: '/g/prise', callback_data: 'Хочу узнать цены' }],
];
