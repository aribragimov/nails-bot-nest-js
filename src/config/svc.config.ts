import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  databaseUrl: process.env.DATABASE_URL,
  tgBot: {
    token: process.env.TG_BOT_TOKEN,
  },
  adminIds: [process.env.ADMIN_AR, process.env.ADMIN_AN],
}));
