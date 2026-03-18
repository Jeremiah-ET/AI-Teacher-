import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Session = sequelize.define(
  "Session",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    correctAnswers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    mode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "written",
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Mixed",
    },
    xpEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    missedCardIds: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    missedTopics: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "sessions",
    timestamps: true,
  },
);

export default Session;
