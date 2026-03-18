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
    gradeLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "High School",
      validate: {
        notEmpty: true,
      },
    },
    favoriteSubject: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "General Study",
      validate: {
        notEmpty: true,
      },
    },
    learningStyle: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Visual",
      validate: {
        isIn: [["Visual", "Auditory", "Reading/Writing", "Kinesthetic"]],
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
    studyDaysPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 7,
      },
    },
    themePreference: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Ocean",
      validate: {
        isIn: [["Ocean", "Sunrise", "Forest"]],
      },
    },
    focusMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    bio: {
      type: DataTypes.STRING(240),
      allowNull: false,
      defaultValue: "",
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
