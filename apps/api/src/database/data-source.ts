import 'reflect-metadata';
import 'tsconfig-paths/register';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { readSecret } from '../config/secret';

// En local : charge le .env. En prod (Docker) : les vars sont déjà injectées, dotenv ne les écrase pas.
config({ path: `${__dirname}/../../.env` });

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: readSecret('DB_USER'),
  password: readSecret('DB_PASSWORD'),
  database: readSecret('DB_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
