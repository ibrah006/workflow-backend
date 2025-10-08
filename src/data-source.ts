import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { TaskSubscriber } from './subscribers/task.subscriber';

dotenv.config();

// console.log("database name:", process.env.DB_NAME);

// export const AppDataSource = new DataSource({
//     type: 'postgres',
//     host: process.env.DB_HOST_PRODUCTION,
//     port: Number(process.env.DB_PORT),
//     username: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     url: process.env.DB_URL,
//     entities: ["dist/models/*.js"],
//     migrations: ["dist/migrations/*.js"],
//     ssl: {
//         rejectUnauthorized: false
//     }
//     subscribers: [TaskSubscriber],
// });

export const AppDataSource = new DataSource({
    type: 'postgres',
    synchronize: true, // only for dev
    logging: true,
    host: process.env.DB_HOST_DEV,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ["src/models/*.ts"],
    migrations: ["src/migration/*.ts"],
    subscribers: [TaskSubscriber],
  });
