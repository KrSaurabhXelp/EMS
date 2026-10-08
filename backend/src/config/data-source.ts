import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { entities } from "../entities";

dotenv.config();

const PORT = Number(process.env.PORT ?? 5000)

const dbHost = process.env.DB_HOST ?? "localhost";
const dbPort = Number(process.env.DB_PORT ?? 3306);
const dbUser = process.env.DB_USERNAME ?? "root";
const dbPassword = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: dbHost,
  port: dbPort,
  username: dbUser,
  password: dbPassword,
  database: dbName,
  synchronize: true,
  logging: false,
  entities,
});