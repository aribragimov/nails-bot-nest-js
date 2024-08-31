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

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  private readonly bot: TelegramBot;

  constructor(private readonly configService: ConfigService, private readonly windowService: WindowService) {
    const token = this.configService.get<string>('config.tgBot.token');
    if (!token) {
      throw new Error('Telegram Bot Token not found in configuration.');
    }
    this.bot = new TelegramBot(token, { polling: true });
  }

  public initBot() {
    this.bot.onText(botCommands.start.regex, msg => {
      const chatId: string = msg.chat.id.toString();
      const adminIds = this.configService.get<string[]>(`config.adminIds`);

      if (adminIds && adminIds.includes(chatId.toString())) {
        return this.bot.sendMessage(
          chatId,
          '[ADMIN]\n Добро пожаловать в тестовую версию бота,\n выберите что вы хотите сделать:',
          this.generateOptions([
            { callback_data: botCommands.win.create.main, text: 'Добавить окошки' },
            { callback_data: botCommands.win.get.main, text: 'Посмотреть окошки' },
            { callback_data: botCommands.win.update.main, text: 'Обновить окошко' },
            // [{ callback_data: '/win/delete', text: 'Удалить окошко' }],
          ]),
        );
      }

      return this.bot.sendMessage(
        chatId,
        'Добро пожаловать в тестовую версию бота,\n выберите что вы хотите сделать:',
        this.generateOptions([
          { callback_data: botCommands.win.get.main, text: 'Хочу узнать когда есть свободные окошки' },
          // [{ text: '/g/prise', callback_data: 'Хочу узнать цены' }],
        ]),
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
        // CREATE
        // -------------------------------------------------------------------------------------

        // CREATE MAIN
        if (path === botCommands.win.create.main) {
          return this.bot.editMessageText('Выберите действие', {
            chat_id: chatId,
            message_id: messageId,
            ...this.generateOptions([
              this.addBackButton(botCommands.start.main),
              { callback_data: botCommands.win.create.one.main, text: 'Добавить окошки на один день' },
              { callback_data: botCommands.win.create.many.main, text: 'Добавить окошки на разные даты' },
            ]),
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
            ...this.generateOptions([
              this.addBackButton(botCommands.win.create.main),
              { text: getMonthName(thisMonth), callback_data: `/win/create/one/month/${thisMonth}` },
              { text: getMonthName(nextMonth), callback_data: `/win/create/one/month/${nextMonth}` },
            ]),
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

          return this.bot.sendMessage(chatId, 'Выберите день', {
            reply_markup: {
              inline_keyboard: [...splitDaysOnWeek(allDays), [this.addBackButton(botCommands.win.create.one.main)]],
            },
          });
        }

        if (botCommands.win.create.one.selectDay.regex.test(path)) {
          return this.bot
            .sendMessage(chatId, 'Пришлите время окошек в формате:\n10:00, 11:00, 12:00\n')
            .then(async () => {
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
              `Пришлите одно или несколько окошек в формате:\n
            число\\.месяц: часы:минуты, часы:минуты\n
            \n
            Пример:\n
            01\\.01: 10:00, 11:00, 12:00\n
            02\\.01: 16:35, 18:20, 19:00`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'MarkdownV2',
              },
            )
            .then(async () => {
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
          return this.bot.sendMessage(
            chatId,
            'Выберите действие',
            this.generateOptions([
              { callback_data: botCommands.win.get.today, text: 'На сегодня' },
              { callback_data: botCommands.win.get.week, text: 'На этой неделе' },
              { callback_data: botCommands.win.get.nextWeek, text: 'На следующей неделе' },
              { callback_data: botCommands.win.get.month, text: 'В этом месяц' },
              { callback_data: botCommands.win.get.all, text: 'Все' },
              this.addBackButton('/start'),
            ]),
          );
        }

        // GET All TODAY WINDOWS
        if (path === botCommands.win.get.today) {
          const result = await this.windowService.getWindowsToday();
          if (result.isErr()) return this.bot.sendMessage(chatId, result.unwrapErr());
          return this.bot.sendMessage(chatId, result.unwrap());
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
        if (path === botCommands.win.get.month) {
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

  private generateOptions(options: Option[]) {
    return {
      reply_markup: {
        inline_keyboard: options.map(option => [option]),
      },
    };
  }

  private addBackButton(path: string) {
    return { callback_data: path, text: '↩️ назад' };
  }
}
