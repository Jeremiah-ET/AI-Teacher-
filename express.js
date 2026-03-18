import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import connectDB from "./config/db.js";
import flashcardRoutes from "./routes/flashcards.js";
import sessionRoutes from "./routes/sessions.js";
import profileRoutes from "./routes/profile.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// API Routes
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/profile", profileRoutes);

// Routes
app.get("/", (req, res) => {
  res.render("home", { currentPage: "dashboard" });
});

app.get("/home", (req, res) => {
  res.render("home", { currentPage: "dashboard" });
});

app.get("/flashcards", (req, res) => {
  res.render("flashcards", { currentPage: "flashcards" });
});

app.get("/practice", (req, res) => {
  res.render("practice", { currentPage: "practice" });
});

app.get("/progress", (req, res) => {
  res.render("progress", { currentPage: "progress" });
});

app.get("/profile", (req, res) => {
  res.render("profile", { currentPage: "profile" });
});

// Backward compatibility for old links
app.get("/views/home.ejs", (req, res) => {
  res.redirect("/");
});

app.get("/views/flashcards.ejs", (req, res) => {
  res.redirect("/flashcards");
});

app.get("/views/practice.ejs", (req, res) => {
  res.redirect("/practice");
});

app.get("/views/progress.ejs", (req, res) => {
  res.redirect("/progress");
});

app.get("/views/profile.ejs", (req, res) => {
  res.redirect("/profile");
});

// Start server
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
