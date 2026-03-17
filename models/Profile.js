import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Profile = sequelize.define(
  "Profile",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Student",
      validate: {
        notEmpty: true,
      },
    },
    dailyGoalMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 1,
      },
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
    tableName: "profiles",
    timestamps: true,
  },
);

export default Profile;
