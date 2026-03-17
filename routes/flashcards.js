import express from "express";
import Flashcard from "../models/Flashcard.js";

const router = express.Router();

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
    const { topic, question, answer } = req.body;

    if (!topic || !question || !answer) {
      return res
        .status(400)
        .json({ error: "Topic, question, and answer are required" });
    }

    const flashcard = await Flashcard.create({
      topic: topic.trim(),
      question: question.trim(),
      answer: answer.trim(),
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
    const { topic, question, answer } = req.body;

    if (!topic || !question || !answer) {
      return res
        .status(400)
        .json({ error: "Topic, question, and answer are required" });
    }

    const [updatedRowsCount] = await Flashcard.update(
      {
        topic: topic.trim(),
        question: question.trim(),
        answer: answer.trim(),
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
