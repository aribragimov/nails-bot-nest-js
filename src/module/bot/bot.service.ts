import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DateTime } from 'luxon';
import * as TelegramBot from 'node-telegram-bot-api';

import { forEachPromise } from 'src/common/helpers';

import { botCommands } from './constants';
import {
  getMonthName,
  getMonthsNamesWithActualMonth,
  getSplitPath,
  splitDaysOnWeek,
  splitMonthsOnYear,
  splitWindowsOnDay,
} from './helpers';
import { Option } from './interfaces';

import { WindowService } from '../window';
import { createWindowMainOptions, getWindowMainOptions, startAdminOptions, startUserOptions } from './options';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  private readonly bot: TelegramBot;

  constructor(
    private readonly configService: ConfigService,
    private readonly windowService: WindowService,
  ) {
    const token = this.configService.get<string>('config.tgBot.token');
    if (!token) {
      throw new Error('Telegram Bot Token not found in configuration.');
    }
    this.bot = new TelegramBot(token, { polling: true });
  }

  public initBot() {
    this.bot.onText(botCommands.start.regex, msg => {
      this.bot.removeAllListeners();
      const chatId: string = msg.chat.id.toString();
      const adminIds = this.configService.get<string[]>(`config.adminIds`);

      if (adminIds && adminIds.includes(chatId.toString())) {
        return this.bot.sendMessage(
          chatId,
          '[ADMIN]\n Добро пожаловать в тестовую версию бота,\n выберите что вы хотите сделать:',
          this.generateOptions(startAdminOptions),
        );
      }

      return this.bot.sendMessage(
        chatId,
        'Добро пожаловать в тестовую версию бота,\n выберите что вы хотите сделать:',
        this.generateOptions(startUserOptions),
      );
    });

    this.bot.on('callback_query', async callbackQuery => {
      const messageId = callbackQuery.message?.message_id;

      if (!messageId) {
        this.logger.error(`No message id`);
      }

      const chatId = callbackQuery.from.id;
      const path = callbackQuery.data;
      console.log('callbackQueryHandler: ', path);

      await this.bot.answerCallbackQuery(callbackQuery.id);

      if (path) {
        // -------------------------------------------------------------------------------------
        // START
        // -------------------------------------------------------------------------------------
        if (path === botCommands.start.main) {
          this.bot.removeAllListeners();
          const adminIds = this.configService.get<string[]>(`config.adminIds`);
          console.log(chatId);
          if (adminIds && adminIds.includes(chatId.toString()) && chatId) {
            return this.bot.editMessageText(
              '[ADMIN]\n Добро пожаловать в тестовую версию бота,\n выберите что вы хотите сделать:',
              {
                chat_id: chatId,
                message_id: messageId,
                ...this.generateOptions(startAdminOptions),
              },
            );
          }

          return this.bot.editMessageText(
            'Добро пожаловать в тестовую версию бота,\n выберите что вы хотите сделать:',
            {
              chat_id: chatId,
              message_id: messageId,
              ...this.generateOptions(startUserOptions),
            },
          );
        }

        // -------------------------------------------------------------------------------------
        // CREATE
        // -------------------------------------------------------------------------------------

        // CREATE MAIN
        if (path === botCommands.win.create.main) {
          return this.bot.editMessageText('Выберите действие', {
            chat_id: chatId,
            message_id: messageId,
            ...this.generateOptions(createWindowMainOptions, botCommands.start.main),
          });
        }

        // CREATE ONE WINDOW
        if (path === botCommands.win.create.one.main) {
          const dateNow = DateTime.now();

          const thisMonth = dateNow.month;
          const nextMonth = thisMonth + 1;
          return this.bot.editMessageText('Выберите месяц', {
            chat_id: chatId,
            message_id: messageId,
            ...this.generateOptions(
              [
                { text: getMonthName(thisMonth), callback_data: `/win/c/one/month/${thisMonth}` },
                { text: getMonthName(nextMonth), callback_data: `/win/c/one/month/${nextMonth}` },
              ],
              botCommands.win.create.main,
            ),
          });
        }

        if (botCommands.win.create.one.selectMonth.regex.test(path)) {
          const windowMonth = Number(path.split('month/')[1]);

          const dateNow = DateTime.now();

          let allDays: { text: string; callback_data: string }[];

          if (windowMonth === dateNow.month) {
            allDays = Array.from(Array(dateNow.daysInMonth))
              .map((_, i) => i + 1)
              .splice(dateNow.day - 1)
              .map(value => ({
                text: value.toString(),
                callback_data: `${path}/day/${value}`,
              }));
          } else {
            const windowDate = DateTime.fromObject({
              year: dateNow.year,
              month: windowMonth,
            });

            allDays = Array.from(Array(windowDate.daysInMonth)).map((_, i) => {
              const value = (i + 1).toString();
              return { text: value, callback_data: `${path}/day/${value}` };
            });
          }

          return this.bot.editMessageText('Выберите день', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [...splitDaysOnWeek(allDays), [this.addBackButton(botCommands.win.create.one.main)]],
            },
          });
        }

        if (botCommands.win.create.one.selectDay.regex.test(path)) {
          return this.bot
            .editMessageText('Пришлите время окошек в формате:\n10:00, 11:00, 12:00\n', {
              chat_id: chatId,
              message_id: messageId,
            })
            .then(async () => {
              this.bot.removeTextListener(botCommands.win.create.one.regex);
              this.bot.onText(botCommands.win.create.one.regex, async replyMsg => {
                const { text } = replyMsg;

                if (!text) return;

                const result = await this.windowService.createWindow(path, text);

                if (result.isErr()) await this.bot.sendMessage(chatId, result.unwrapErr());

                await forEachPromise(result.unwrap(), async window => this.bot.sendMessage(chatId, window));
              });
            });
        }

        // CREATE MANY WINDOWS
        if (path === botCommands.win.create.many.main) {
          return this.bot
            .editMessageText(
              `Пришлите одно или несколько окошек в формате:\nчисло\\.месяц: часы:минуты, часы:минуты\n\nПример:\n01\\.01: 10:00, 11:00, 12:00\n02\\.01: 16:35, 18:20, 19:00`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'MarkdownV2',
              },
            )
            .then(async () => {
              this.bot.removeTextListener(botCommands.win.create.many.regex);
              this.bot.onText(botCommands.win.create.many.regex, async replyMsg => {
                const { text } = replyMsg;

                if (!text) return;

                const result = await this.windowService.createWindowMany(text);

                if (result.isErr()) await this.bot.sendMessage(chatId, result.unwrapErr());

                await forEachPromise(result.unwrap(), async window => this.bot.sendMessage(chatId, window));
              });
            });
        }

        // -------------------------------------------------------------------------------------
        // GET
        // -------------------------------------------------------------------------------------

        // GET MAIN
        if (path === botCommands.win.get.main) {
          return this.bot.editMessageText('Выберите действие', {
            chat_id: chatId,
            message_id: messageId,
            ...this.generateOptions(getWindowMainOptions, botCommands.start.main),
          });
        }

        // GET TODAY WINDOWS
        if (path === botCommands.win.get.today) {
          const result = await this.windowService.getWindowsToday();
          if (result.isErr()) return this.bot.sendMessage(chatId, result.unwrapErr());
          return this.bot.sendMessage(chatId, result.unwrap());
        }

        // GET WINDOWS THIS WEEK
        if (path === botCommands.win.get.week) {
          const result = await this.windowService.getWindowsWeek();
          if (result.isErr()) return this.bot.sendMessage(chatId, result.unwrapErr());
          return this.bot.sendMessage(chatId, result.unwrap());
        }

        // GET WINDOWS NEXT WEEK
        if (path === botCommands.win.get.nextWeek) {
          const result = await this.windowService.getWindowsNextWeek();
          if (result.isErr()) return this.bot.sendMessage(chatId, result.unwrapErr());
          return this.bot.sendMessage(chatId, result.unwrap());
        }

        // GET WINDOWS MONTH
        if (path === botCommands.win.get.month) {
          const result = await this.windowService.getWindowsMonth();
          if (result.isErr()) return this.bot.sendMessage(chatId, result.unwrapErr());
          return this.bot.sendMessage(chatId, result.unwrap());
        }

        // GET ALL WINDOWS
        if (path === botCommands.win.get.all) {
          const result = await this.windowService.getAllWindows();
          if (result.isErr()) return this.bot.sendMessage(chatId, result.unwrapErr());
          return this.bot.sendMessage(chatId, result.unwrap());
        }

        // -------------------------------------------------------------------------------------
        // UPDATE
        // -------------------------------------------------------------------------------------

        if (path === botCommands.win.update.main) {
          const dateNow = DateTime.now();

          const actualMonth = dateNow.month;

          const months = getMonthsNamesWithActualMonth(actualMonth).map(month => ({
            callback_data: `/win/u/isBooked/month/${month.number}`,
            text: month.name,
          }));

          return this.bot.sendMessage(chatId, 'Выберите месяц', {
            reply_markup: {
              inline_keyboard: [...splitMonthsOnYear(months), [this.addBackButton('/start')]],
            },
          });
        }

        if (botCommands.win.update.selectMonth.regex.test(path)) {
          const dateNow = DateTime.now();

          const windowMonth = Number(path.split('/')[5]);

          let allDays: { text: string; callback_data: string }[];

          if (windowMonth === dateNow.month) {
            allDays = Array.from(Array(dateNow.daysInMonth))
              .map((_, i) => i + 1)
              .splice(dateNow.day - 1)
              .map(value => ({
                text: value.toString(),
                callback_data: `${path}/day/${value}`,
              }));
          } else {
            const windowDate = DateTime.fromObject({
              year: dateNow.year,
              month: windowMonth,
            });

            allDays = Array.from(Array(windowDate.daysInMonth)).map((_, i) => {
              const value = (i + 1).toString();
              return { text: value, callback_data: `${path}/day/${value}` };
            });
          }

          return this.bot.sendMessage(chatId, 'Выберите день', {
            reply_markup: {
              inline_keyboard: [...splitDaysOnWeek(allDays), [this.addBackButton('/win/u/isBooked')]],
            },
          });
        }

        if (botCommands.win.update.selectDay.regex.test(path)) {
          const dateNow = DateTime.now();
          const splitPath = getSplitPath(path);

          const month = Number(splitPath[4]);
          const day = Number(splitPath[6]);

          const startDate = DateTime.fromObject({
            year: dateNow.year,
            month,
            day,
          }).toJSDate();

          const endDate = DateTime.fromObject({
            year: dateNow.year,
            month,
            day: day + 1,
          }).toJSDate();

          const windows = await this.windowService.getMany(startDate, endDate);

          const windowsData = windows.map(window => ({
            callback_data: `${path}/win/${window.id}`,
            text: DateTime.fromJSDate(window.date).toFormat('HH:mm').toString(),
          }));

          console.log(JSON.stringify(splitWindowsOnDay(windowsData), null, 2));

          return this.bot.sendMessage(chatId, 'Выберите окошко', {
            reply_markup: {
              inline_keyboard: [...splitWindowsOnDay(windowsData), [this.addBackButton('/win/u/isBooked')]],
            },
          });
        }
      }

      return this.bot.sendMessage(chatId, 'Undefined ');
    });
  }

  private generateOptions(options: Option[], backButtonPath?: string) {
    const keyboardOptions = [...options];

    if (backButtonPath) {
      keyboardOptions.unshift(this.addBackButton(backButtonPath));
    }

    return {
      reply_markup: {
        inline_keyboard: [...keyboardOptions.map(option => [option])],
      },
    };
  }

  private addBackButton(path: string) {
    return { callback_data: path, text: '↩️ назад' };
  }
}
