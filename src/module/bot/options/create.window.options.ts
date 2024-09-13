import { botCommands } from '../constants';

export const createWindowMainOptions = [
  { callback_data: botCommands.win.create.one.main, text: 'Добавить окошки на один день' },
  { callback_data: botCommands.win.create.many.main, text: 'Добавить окошки на разные даты' },
];
