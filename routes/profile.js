import express from "express";
import Profile from "../models/Profile.js";

const router = express.Router();
const LEARNING_STYLES = [
  "Visual",
  "Auditory",
  "Reading/Writing",
  "Kinesthetic",
];
const THEMES = ["Ocean", "Sunrise", "Forest"];

// GET /api/profile - Get user profile
router.get("/", async (req, res) => {
  try {
    let profile = await Profile.findOne();

    // If no profile exists, create a default one
    if (!profile) {
      profile = await Profile.create();
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/profile - Update user profile
router.put("/", async (req, res) => {
  try {
    const {
      studentName,
      gradeLevel,
      favoriteSubject,
      learningStyle,
      dailyGoalMinutes,
      studyDaysPerWeek,
      themePreference,
      focusMode,
      bio,
    } = req.body;

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: "Student name is required" });
    }

    if (!gradeLevel || !gradeLevel.trim()) {
      return res.status(400).json({ error: "Grade level is required" });
    }

    if (!favoriteSubject || !favoriteSubject.trim()) {
      return res.status(400).json({ error: "Favorite subject is required" });
    }

    if (!LEARNING_STYLES.includes(learningStyle)) {
      return res.status(400).json({ error: "Invalid learning style" });
    }

    if (
      dailyGoalMinutes !== undefined &&
      (dailyGoalMinutes < 1 || dailyGoalMinutes > 1440)
    ) {
      return res
        .status(400)
        .json({ error: "Daily goal must be between 1 and 1440 minutes" });
    }

    if (
      studyDaysPerWeek !== undefined &&
      (studyDaysPerWeek < 1 || studyDaysPerWeek > 7)
    ) {
      return res
        .status(400)
        .json({ error: "Study days per week must be between 1 and 7" });
    }

    if (!THEMES.includes(themePreference)) {
      return res.status(400).json({ error: "Invalid theme preference" });
    }

    if (String(bio || "").length > 240) {
      return res.status(400).json({ error: "Bio must be 240 characters or less" });
    }

    let profile = await Profile.findOne();

    if (!profile) {
      profile = await Profile.create();
    }

    await profile.update({
      studentName: studentName.trim(),
      gradeLevel: gradeLevel.trim(),
      favoriteSubject: favoriteSubject.trim(),
      learningStyle,
      dailyGoalMinutes:
        dailyGoalMinutes !== undefined
          ? Number(dailyGoalMinutes)
          : profile.dailyGoalMinutes,
      studyDaysPerWeek:
        studyDaysPerWeek !== undefined
          ? Number(studyDaysPerWeek)
          : profile.studyDaysPerWeek,
      themePreference,
      focusMode: Boolean(focusMode),
      bio: String(bio || "").trim(),
    });

    res.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
