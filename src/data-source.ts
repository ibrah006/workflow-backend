import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

console.log("database name:", process.env.DB_NAME);

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    entities: ["src/models/*.ts"],
    migrations: ["src/migration/**/*.ts"]
});