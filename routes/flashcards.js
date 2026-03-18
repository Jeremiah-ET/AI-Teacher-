import express from "express";
import Flashcard from "../models/Flashcard.js";

const router = express.Router();
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

function sanitizeFlashcardPayload(body) {
  return {
    topic: String(body.topic || "").trim(),
    question: String(body.question || "").trim(),
    answer: String(body.answer || "").trim(),
    difficulty: String(body.difficulty || "medium").trim().toLowerCase(),
    tags: String(body.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", "),
  };
}

// GET /api/flashcards - Get all flashcards
router.get("/", async (req, res) => {
  try {
    const flashcards = await Flashcard.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(flashcards);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

// POST /api/flashcards - Create a new flashcard
router.post("/", async (req, res) => {
  try {
    const { topic, question, answer, difficulty, tags } =
      sanitizeFlashcardPayload(req.body);

    if (!topic || !question || !answer) {
      return res
        .status(400)
        .json({ error: "Topic, question, and answer are required" });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty" });
    }

    const flashcard = await Flashcard.create({
      topic,
      question,
      answer,
      difficulty,
      tags,
      nextReviewAt: new Date(),
    });

    res.status(201).json(flashcard);
  } catch (error) {
    console.error("Error creating flashcard:", error);
    res.status(500).json({ error: "Failed to create flashcard" });
  }
});

// PUT /api/flashcards/:id - Update a flashcard
router.put("/:id", async (req, res) => {
  try {
    const { topic, question, answer, difficulty, tags } =
      sanitizeFlashcardPayload(req.body);

    if (!topic || !question || !answer) {
      return res
        .status(400)
        .json({ error: "Topic, question, and answer are required" });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty" });
    }

    const [updatedRowsCount] = await Flashcard.update(
      {
        topic,
        question,
        answer,
        difficulty,
        tags,
      },
      { where: { id: req.params.id } },
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    const updatedFlashcard = await Flashcard.findByPk(req.params.id);
    res.json(updatedFlashcard);
  } catch (error) {
    console.error("Error updating flashcard:", error);
    res.status(500).json({ error: "Failed to update flashcard" });
  }
});

// POST /api/flashcards/:id/review - Update spaced repetition data
router.post("/:id/review", async (req, res) => {
  try {
    const { result } = req.body;
    if (!["correct", "incorrect"].includes(result)) {
      return res.status(400).json({ error: "Review result must be valid" });
    }

    const flashcard = await Flashcard.findByPk(req.params.id);
    if (!flashcard) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    const wasCorrect = result === "correct";
    const reviewCount = flashcard.reviewCount + 1;
    const correctCount = flashcard.correctCount + (wasCorrect ? 1 : 0);
    const wrongCount = flashcard.wrongCount + (wasCorrect ? 0 : 1);
    const masteryDelta = wasCorrect ? 12 : -10;
    const masteryLevel = Math.max(
      0,
      Math.min(100, flashcard.masteryLevel + masteryDelta),
    );
    const nextReviewDays = wasCorrect
      ? Math.max(1, Math.ceil(masteryLevel / 20))
      : 1;
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + nextReviewDays);

    await flashcard.update({
      reviewCount,
      correctCount,
      wrongCount,
      masteryLevel,
      lastReviewedAt: new Date(),
      nextReviewAt,
    });

    res.json(flashcard);
  } catch (error) {
    console.error("Error reviewing flashcard:", error);
    res.status(500).json({ error: "Failed to update flashcard review" });
  }
});

// DELETE /api/flashcards/:id - Delete a flashcard
router.delete("/:id", async (req, res) => {
  try {
    const deletedRowsCount = await Flashcard.destroy({
      where: { id: req.params.id },
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    res.json({ message: "Flashcard deleted successfully" });
  } catch (error) {
    console.error("Error deleting flashcard:", error);
    res.status(500).json({ error: "Failed to delete flashcard" });
  }
});

export default router;
