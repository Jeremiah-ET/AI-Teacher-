import express from "express";
import Session from "../models/Session.js";

const router = express.Router();

// GET /api/sessions - Get all sessions
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.findAll({ order: [["createdAt", "DESC"]] });
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// POST /api/sessions - Create a new session
router.post("/", async (req, res) => {
  try {
    const {
      score,
      durationMinutes,
      totalQuestions,
      correctAnswers,
      mode,
      topic,
      xpEarned,
      missedCardIds,
      missedTopics,
    } = req.body;

    if (
      score === undefined ||
      durationMinutes === undefined ||
      totalQuestions === undefined ||
      correctAnswers === undefined
    ) {
      return res.status(400).json({
        error:
          "Score, duration, total questions, and correct answers are required",
      });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({ error: "Score must be between 0 and 100" });
    }

    if (durationMinutes < 0 || totalQuestions < 1 || correctAnswers < 0) {
      return res.status(400).json({ error: "Invalid session data" });
    }

    const session = await Session.create({
      score: Number(score),
      durationMinutes: Number(durationMinutes),
      totalQuestions: Number(totalQuestions),
      correctAnswers: Number(correctAnswers),
      mode: String(mode || "written"),
      topic: String(topic || "Mixed"),
      xpEarned: Number(xpEarned) || 0,
      missedCardIds: Array.isArray(missedCardIds) ? missedCardIds : [],
      missedTopics: Array.isArray(missedTopics) ? missedTopics : [],
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /api/sessions/stats - Get session statistics
router.get("/stats", async (req, res) => {
  try {
    const sessions = await Session.findAll();

    if (sessions.length === 0) {
      return res.json({
        totalSessions: 0,
        totalMinutes: 0,
        avgScore: 0,
        bestScore: 0,
      });
    }

    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.durationMinutes,
      0,
    );
    const avgScore = Math.round(
      sessions.reduce((sum, session) => sum + session.score, 0) /
        sessions.length,
    );
    const bestScore = Math.max(...sessions.map((session) => session.score));

    res.json({
      totalSessions: sessions.length,
      totalMinutes,
      avgScore,
      bestScore,
    });
  } catch (error) {
    console.error("Error fetching session stats:", error);
    res.status(500).json({ error: "Failed to fetch session statistics" });
  }
});

export default router;
