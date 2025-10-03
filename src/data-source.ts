import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

// console.log("database name:", process.env.DB_NAME);

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST_PRODUCTION,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    url: process.env.DB_URL,
    entities: ["dist/models/*.ts"],
    migrations: ["dist/migration/**/*.ts"],
    ssl: {
        rejectUnauthorized: false
    }
});

// export const AppDataSource = new DataSource({
//     type: 'postgres',
//     url: process.env.DB_URL, // Render connection string
//     synchronize: false, // Set to true only for dev
//     logging: false,
//     entities: ["src/models/*.ts"],
//     migrations: ["src/migration/**/*.ts"],
//     ssl: {
//       rejectUnauthorized: false, // Required for Render
//     },
//   });
