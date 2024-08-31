import { Injectable, Logger } from '@nestjs/common';

import { Err, Ok, Result } from '@thames/monads';
import { parseInt } from 'lodash';
import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';

import { timezone } from 'src/config/timezone.config';

import { forEachPromise, getRepository, withTransaction } from 'src/common/helpers';
import { DomainServiceOptions } from 'src/common/types';

import { WindowEntity } from './window.entity';

@Injectable()
export class WindowService {
  constructor(private readonly logger: Logger, private readonly datasource: DataSource) {
    this.logger = new Logger(WindowService.name);
  }

  // -------------------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------------------
  public async createWindowMany(text: string): Promise<Result<string[], string>> {
    const uniqueDates: Record<string, Date> = {};
    const lines = text.split('\n');
    const currentYear = DateTime.now().year;

    lines.forEach(line => {
      const [datePart, timesPart] = line.split(': ');
      if (datePart && timesPart) {
        const [day, month] = datePart.split('.');
        const times = timesPart.split(', ');

        times.forEach(time => {
          const [hours, minutes] = time.split(':');
          const dateObj = DateTime.fromObject(
            {
              year: currentYear,
              month: parseInt(month),
              day: parseInt(day),
              hour: parseInt(hours),
              minute: parseInt(minutes),
            },
            timezone,
          ).toJSDate();

          const dateKey = dateObj.toISOString();

          if (!uniqueDates[dateKey]) {
            uniqueDates[dateKey] = dateObj;
          }
        });
      }
    });

    const parsedDates = Object.values(uniqueDates);

    if (!parsedDates.length) {
      return Err('Окошки не созданы, повотрите попытку');
    }

    const result = await this.createMany(parsedDates);

    return Ok(result);
  }

  public async createWindow(path: string, text: string): Promise<Result<string[], string>> {
    const uniqueDates: Record<string, Date> = {};
    const currentYear = DateTime.now().year;

    const month = path.split('/')[3].split('=')[1];
    const day = path.split('/')[4].split('=')[1];

    const times = text.split(', ');

    times.forEach(time => {
      const [hours, minutes] = time.split(':');
      const dateObj = DateTime.fromObject(
        {
          year: currentYear,
          month: parseInt(month),
          day: parseInt(day),
          hour: parseInt(hours),
          minute: parseInt(minutes),
        },
        timezone,
      ).toJSDate();

      const dateKey = dateObj.toISOString();

      if (!uniqueDates[dateKey]) {
        uniqueDates[dateKey] = dateObj;
      }
    });

    const parsedDates = Object.values(uniqueDates);

    if (!parsedDates.length) return Err('Окошки не созданы');

    const result = await this.createMany(parsedDates);

    if (!result.length) {
      return Err('Окошки не созданы, повотрите попытку');
    }

    return Ok(result);
  }

  public async createMany(parsedDates: Date[]) {
    let result: string[] = [];

    await withTransaction(this.datasource, async queryRunner => {
      const createdWindows: WindowEntity[] = await forEachPromise(parsedDates, async parsedDate =>
        this.create({ date: parsedDate }, { queryRunner }),
      );

      if (!createdWindows.length) return;

      result = await this.buildCreateResponse(createdWindows.map(createdWindow => createdWindow.date));
    });

    return result;
  }

  public async create(
    window: Partial<WindowEntity>,
    { queryRunner }: DomainServiceOptions = {},
  ): Promise<WindowEntity> {
    const windowRepository = getRepository(queryRunner ?? this.datasource, WindowEntity);
    const entity = windowRepository.create(window);

    return windowRepository.save(entity);
  }

  private async buildCreateResponse(dates: Date[]): Promise<string[]> {
    const result: string[] = [];

    const groupedDates = dates.reduce((acc: { [key: string]: string[] }, date) => {
      const dt = DateTime.fromJSDate(date);
      const dayMonth = dt.toFormat('dd.MM');

      if (!acc[dayMonth]) {
        acc[dayMonth] = [];
      }

      acc[dayMonth].push(dt.toFormat('HH:mm'));

      return acc;
    }, {});

    await forEachPromise(Object.entries(groupedDates), async ([dayMonth, times]) => {
      let preResult = `${dayMonth}: `;
      preResult += times.map(time => `  ${time}`).join(',');
      result.push(preResult.trim());
    });

    return result;
  }

  // -------------------------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------------------------

  public async getWindowsToday({ queryRunner }: DomainServiceOptions = {}): Promise<Result<string, string>> {
    const dateNow = DateTime.now();

    const startDate = dateNow.toJSDate();
    const endDate = dateNow.endOf('day').toJSDate();

    const windows = await getRepository(queryRunner ?? this.datasource, WindowEntity)
      .createQueryBuilder('window')
      .where('window.date >= :startDate', { startDate })
      .andWhere('window.date <= :endDate', { endDate })
      .orderBy('window.date', 'ASC')
      .getMany();

    if (!windows) return Err('Окошек нет');

    const results = await this.buildGetResponse(windows.map(window => window.date));

    return Ok(`Окошки на сегодня:\n\n${results}`);
  }

  public async getWindowsWeek({ queryRunner }: DomainServiceOptions = {}): Promise<Result<string, string>> {
    const dateNow = DateTime.now();

    const startDate = dateNow.toJSDate();
    const endDate = dateNow.endOf('week').toJSDate();

    const windows = await getRepository(queryRunner ?? this.datasource, WindowEntity)
      .createQueryBuilder('window')
      .where('window.date >= :startDate', { startDate })
      .andWhere('window.date <= :endDate', { endDate })
      .orderBy('window.date', 'ASC')
      .getMany();

    if (!windows) return Err('Окошек нет');

    const results = this.buildGetResponse(windows.map(window => window.date));

    return Ok(`Окошки на этой неделе:\n\n${results}`);
  }

  public async getWindowsNextWeek({ queryRunner }: DomainServiceOptions = {}): Promise<Result<string, string>> {
    const dt = DateTime.now().plus({ week: 1 });

    const startDate = dt.startOf('week').toJSDate();
    const endDate = dt.endOf('week').toJSDate();

    const windows = await getRepository(queryRunner ?? this.datasource, WindowEntity)
      .createQueryBuilder('window')
      .where('window.date >= :startDate', { startDate })
      .andWhere('window.date <= :endDate', { endDate })
      .orderBy('window.date', 'ASC')
      .getMany();

    if (!windows) return Err('Окошек нет');

    const results = this.buildGetResponse(windows.map(window => window.date));

    return Ok(`Окошки на следующей неделе:\n\n${results}`);
  }

  public async getWindowsMonth({ queryRunner }: DomainServiceOptions = {}): Promise<Result<string, string>> {
    const dateNow = DateTime.now();

    const startDate = dateNow.toJSDate();
    const endDate = dateNow.endOf('month').toJSDate();

    const windows = await getRepository(queryRunner ?? this.datasource, WindowEntity)
      .createQueryBuilder('window')
      .where('window.date >= :startDate', { startDate })
      .andWhere('window.date <= :endDate', { endDate })
      .orderBy('window.date', 'ASC')
      .getMany();

    if (!windows) return Err('Окошек нет');

    const results = this.buildGetResponse(windows.map(window => window.date));

    return Ok(`Окошки на этот месяц:\n\n${results}`);
  }

  public async getAllWindows({ queryRunner }: DomainServiceOptions = {}): Promise<Result<string, string>> {
    const startDate = DateTime.now().toJSDate();

    const windows = await getRepository(queryRunner ?? this.datasource, WindowEntity)
      .createQueryBuilder('window')
      .where('window.date >= :startDate', { startDate })
      .orderBy('window.date', 'ASC')
      .getMany();

    if (!windows) return Err('Окошек нет');

    const results = this.buildGetResponse(windows.map(window => window.date));

    return Ok(`Все окошки:\n\n${results}`);
  }

  public async getMany(startDate: Date, endDate: Date, { queryRunner }: DomainServiceOptions = {}) {
    return getRepository(queryRunner ?? this.datasource, WindowEntity)
      .createQueryBuilder('window')
      .where('window.date >= :startDate', { startDate })
      .andWhere('window.date <= :endDate', { endDate })
      .orderBy('window.date', 'ASC')
      .getMany();
  }

  private async buildGetResponse(dates: Date[]): Promise<string> {
    let result: string = '';

    const groupedDates = dates.reduce((acc: { [key: string]: string[] }, date) => {
      const dt = DateTime.fromJSDate(date);
      const dayMonth = dt.toFormat('dd.MM');

      if (!acc[dayMonth]) {
        acc[dayMonth] = [];
      }

      acc[dayMonth].push(dt.toFormat('HH:mm'));

      return acc;
    }, {});

    await forEachPromise(Object.entries(groupedDates), async ([dayMonth, times]) => {
      let preResult = `${dayMonth}: `;
      preResult += times.map(time => `  ${time}`).join(',');
      preResult += '\n';
      result += preResult;
    });

    return result;
  }

  // -------------------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------------------
}
