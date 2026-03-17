import { Sequelize } from "sequelize";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function createDatabaseIfNotExists() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    });

    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "ai_teacher"}\``,
    );
    await connection.end();
    console.log("Database created or already exists.");
  } catch (error) {
    console.error("Error creating database:", error);
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME || "ai_teacher",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  },
);

async function connectDB() {
  try {
    // Create database if it doesn't exist
    await createDatabaseIfNotExists();

    // Connect to the database
    await sequelize.authenticate();
    console.log("MySQL database connected.");

    // Sync all models
    await sequelize.sync();
    console.log("Database synchronized.");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

export default connectDB;
export { sequelize };
