import { Test } from '@nestjs/testing';

import { AppModule } from 'src/app.module';
import * as request from 'supertest';

describe('Health', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', () => request(app.getHttpServer()).get('/health').expect(204));
});
