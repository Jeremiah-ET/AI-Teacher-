import express from "express";
import Profile from "../models/Profile.js";

const router = express.Router();

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
    const { studentName, dailyGoalMinutes } = req.body;

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: "Student name is required" });
    }

    if (
      dailyGoalMinutes !== undefined &&
      (dailyGoalMinutes < 1 || dailyGoalMinutes > 1440)
    ) {
      return res
        .status(400)
        .json({ error: "Daily goal must be between 1 and 1440 minutes" });
    }

    let profile = await Profile.findOne();

    if (!profile) {
      profile = await Profile.create();
    }

    await profile.update({
      studentName: studentName.trim(),
      dailyGoalMinutes:
        dailyGoalMinutes !== undefined
          ? Number(dailyGoalMinutes)
          : profile.dailyGoalMinutes,
    });

    res.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
