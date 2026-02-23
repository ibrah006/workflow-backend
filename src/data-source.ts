import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

// console.log("database name:", process.env.DB_NAME);

const isProduction = process.env.IS_PRODUCTION == 'true';

export const AppDataSource = isProduction? new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST_PRODUCTION,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    url: process.env.DB_URL,
    entities: ["src/models/*.ts"], //dist original build folder
    migrations: ["src/migrations/*.ts"],
    ssl: {
        rejectUnauthorized: false
    },
    subscribers: ['src/subscribers/*.ts'],
}) : new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST_DEV,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/models/*.ts'],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  // synchronize: true,
  logging: true,
});
