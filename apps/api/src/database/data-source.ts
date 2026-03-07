import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// En local : charge le .env. En prod (Docker) : les vars sont déjà injectées, dotenv ne les écrase pas.
config({ path: `${__dirname}/../../.env` });

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
