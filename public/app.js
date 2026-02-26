const STORAGE_KEY = "aiTeacher.v1";

const defaultCards = [
  {
    id: "seed-1",
    topic: "Biology",
    question: "What is mitosis?",
    answer:
      "Mitosis is cell division that creates two genetically identical daughter cells.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    topic: "Chemistry",
    question: "What is an atom?",
    answer: "An atom is the smallest unit of matter that keeps chemical properties.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-3",
    topic: "Math",
    question: "What is the Pythagorean theorem?",
    answer: "In a right triangle, a squared plus b squared equals c squared.",
    createdAt: new Date().toISOString(),
  },
];

function createInitialState() {
  return {
    profile: {
      studentName: "Student",
      dailyGoalMinutes: 30,
    },
    flashcards: defaultCards,
    sessions: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      saveState(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    return {
      profile: {
        studentName: parsed?.profile?.studentName || "Student",
        dailyGoalMinutes: Number(parsed?.profile?.dailyGoalMinutes) || 30,
      },
      flashcards: Array.isArray(parsed?.flashcards) ? parsed.flashcards : [],
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    };
  } catch (error) {
    const initial = createInitialState();
    saveState(initial);
    return initial;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(isoDate) {
  if (!isoDate) return "Unknown date";
  return new Date(isoDate).toLocaleDateString();
}

function getTopicCounts(cards) {
  const map = {};
  cards.forEach((card) => {
    const key = card.topic || "General";
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));
}

function getCurrentStreak(sessions) {
  const daySet = new Set(
    sessions.map((session) => {
      const date = new Date(session.createdAt);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  );

  let streak = 0;
  const cursor = new Date();
  while (daySet.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getStats(state) {
  const sessions = state.sessions;
  const totalMinutes = sessions.reduce(
    (sum, session) => sum + (Number(session.durationMinutes) || 0),
    0,
  );
  const avgScore =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, session) => sum + (Number(session.score) || 0), 0) /
            sessions.length,
        )
      : 0;
  const bestScore =
    sessions.length > 0
      ? Math.max(...sessions.map((session) => Number(session.score) || 0))
      : 0;

  return {
    streak: getCurrentStreak(sessions),
    totalCards: state.flashcards.length,
    totalSessions: sessions.length,
    totalMinutes,
    avgScore,
    bestScore,
  };
}

function renderNavActive() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".main-nav a[data-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.link === page);
  });
}

function renderSharedData(state, stats) {
  document.querySelectorAll("[data-student-name]").forEach((el) => {
    el.textContent = state.profile.studentName;
  });

  const idMap = [
    ["dashboard-streak", `${stats.streak} days`],
    ["dashboard-cards", String(stats.totalCards)],
    ["dashboard-accuracy", `${stats.avgScore}%`],
    ["progress-total-sessions", String(stats.totalSessions)],
    ["progress-total-minutes", String(stats.totalMinutes)],
    ["progress-best-score", `${stats.bestScore}%`],
    ["practice-total-cards", String(stats.totalCards)],
    ["flashcard-count", String(stats.totalCards)],
  ];

  idMap.forEach(([id, text]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  });
}

function renderEmptyMessage(container, message) {
  container.innerHTML = `<p class="empty-state">${message}</p>`;
}

function setupDashboard(state) {
  const profileForm = document.getElementById("profile-form");
  const nameInput = document.getElementById("student-name");
  const goalInput = document.getElementById("daily-goal");
  const status = document.getElementById("profile-status");
  const topicList = document.getElementById("dashboard-topic-list");
  const sessionList = document.getElementById("dashboard-session-list");

  if (!profileForm || !nameInput || !goalInput || !topicList || !sessionList) return;

  nameInput.value = state.profile.studentName;
  goalInput.value = String(state.profile.dailyGoalMinutes);

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.profile.studentName = nameInput.value.trim() || "Student";
    state.profile.dailyGoalMinutes = Number(goalInput.value) || 30;
    saveState(state);
    renderSharedData(state, getStats(state));
    status.textContent = "Profile saved.";
  });

  const topicCounts = getTopicCounts(state.flashcards).slice(0, 6);
  if (topicCounts.length === 0) {
    renderEmptyMessage(topicList, "No flashcards yet.");
  } else {
    topicList.innerHTML = topicCounts
      .map((item) => `<div class="metric-row"><span>${item.topic}</span><strong>${item.count}</strong></div>`)
      .join("");
  }

  const recent = [...state.sessions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  if (recent.length === 0) {
    renderEmptyMessage(sessionList, "No practice sessions yet.");
  } else {
    sessionList.innerHTML = recent
      .map(
        (session) => `
          <div class="metric-row">
            <span>${formatDate(session.createdAt)} - ${session.correct}/${session.total}</span>
            <strong>${session.score}%</strong>
          </div>
        `,
      )
      .join("");
  }
}

function setupFlashcards(state) {
  const form = document.getElementById("flashcard-form");
  const list = document.getElementById("flashcard-list");
  const search = document.getElementById("flashcard-search");
  const status = document.getElementById("flashcard-status");
  if (!form || !list || !search) return;

  function renderCards() {
    const term = search.value.trim().toLowerCase();
    const cards = [...state.flashcards]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((card) => {
        if (!term) return true;
        return `${card.topic} ${card.question} ${card.answer}`.toLowerCase().includes(term);
      });

    if (cards.length === 0) {
      renderEmptyMessage(list, "No cards match your search.");
      return;
    }

    list.innerHTML = cards
      .map(
        (card) => `
          <article class="flashcard-item" data-id="${card.id}">
            <div class="flashcard-item-header">
              <span class="pill">${card.topic}</span>
              <button class="danger-btn" type="button" data-action="delete">Delete</button>
            </div>
            <h3>${card.question}</h3>
            <p class="muted">Answer: ${card.answer}</p>
            <p class="meta">Created ${formatDate(card.createdAt)}</p>
          </article>
        `,
      )
      .join("");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const topic = String(formData.get("topic") || "").trim();
    const question = String(formData.get("question") || "").trim();
    const answer = String(formData.get("answer") || "").trim();

    if (!topic || !question || !answer) return;

    state.flashcards.push({
      id: uniqueId("card"),
      topic,
      question,
      answer,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    renderSharedData(state, getStats(state));
    renderCards();
    form.reset();
    status.textContent = "Flashcard added.";
  });

  search.addEventListener("input", renderCards);

  list.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("button[data-action]");
    if (!actionTarget) return;
    const cardNode = actionTarget.closest("[data-id]");
    if (!cardNode) return;
    const cardId = cardNode.dataset.id;

    if (actionTarget.dataset.action === "delete") {
      state.flashcards = state.flashcards.filter((card) => card.id !== cardId);
      saveState(state);
      renderSharedData(state, getStats(state));
      renderCards();
    }
  });

  renderCards();
}

function setupPractice(state) {
  const emptyPanel = document.getElementById("practice-empty");
  const setupPanel = document.getElementById("practice-setup");
  const runPanel = document.getElementById("practice-run");
  const resultPanel = document.getElementById("practice-result");
  const setupForm = document.getElementById("practice-setup-form");
  const countInput = document.getElementById("practice-question-count");
  const progress = document.getElementById("practice-progress");
  const question = document.getElementById("practice-question");
  const answerForm = document.getElementById("practice-answer-form");
  const answer = document.getElementById("practice-answer");
  const submitBtn = document.getElementById("practice-submit");
  const nextBtn = document.getElementById("practice-next");
  const feedback = document.getElementById("practice-feedback");
  const resultScore = document.getElementById("practice-result-score");
  const resultCorrect = document.getElementById("practice-result-correct");
  const resultTotal = document.getElementById("practice-result-total");
  const restartBtn = document.getElementById("practice-restart");

  if (
    !emptyPanel ||
    !setupPanel ||
    !runPanel ||
    !resultPanel ||
    !setupForm ||
    !countInput ||
    !progress ||
    !question ||
    !answerForm ||
    !answer ||
    !submitBtn ||
    !nextBtn ||
    !feedback ||
    !resultScore ||
    !resultCorrect ||
    !resultTotal ||
    !restartBtn
  ) {
    return;
  }

  if (state.flashcards.length === 0) {
    emptyPanel.classList.remove("hidden");
    setupPanel.classList.add("hidden");
    return;
  }

  let runState = null;

  function startSession() {
    const count = Math.min(
      state.flashcards.length,
      Math.max(1, Number(countInput.value) || 5),
    );
    const cards = [...state.flashcards]
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    runState = {
      cards,
      currentIndex: 0,
      correct: 0,
      startMs: Date.now(),
    };

    setupPanel.classList.add("hidden");
    resultPanel.classList.add("hidden");
    runPanel.classList.remove("hidden");
    renderQuestion();
  }

  function renderQuestion() {
    const current = runState.cards[runState.currentIndex];
    progress.textContent = `Question ${runState.currentIndex + 1} of ${runState.cards.length}`;
    question.textContent = current.question;
    answer.value = "";
    feedback.textContent = "";
    submitBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden");
  }

  setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startSession();
  });

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const current = runState.cards[runState.currentIndex];
    const userAnswer = normalizeText(answer.value);
    const expected = normalizeText(current.answer);
    const isCorrect =
      userAnswer.length > 0 &&
      (userAnswer === expected ||
        (userAnswer.length >= 5 && expected.includes(userAnswer)) ||
        (expected.length >= 5 && userAnswer.includes(expected)));

    if (isCorrect) {
      runState.correct += 1;
      feedback.textContent = "Correct.";
      feedback.classList.remove("incorrect");
      feedback.classList.add("correct");
    } else {
      feedback.textContent = `Not quite. Expected: ${current.answer}`;
      feedback.classList.remove("correct");
      feedback.classList.add("incorrect");
    }

    submitBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
  });

  nextBtn.addEventListener("click", () => {
    runState.currentIndex += 1;
    if (runState.currentIndex < runState.cards.length) {
      renderQuestion();
      return;
    }

    const total = runState.cards.length;
    const score = Math.round((runState.correct / total) * 100);
    const durationMinutes = Math.max(1, Math.round((Date.now() - runState.startMs) / 60000));

    state.sessions.push({
      id: uniqueId("session"),
      type: "practice",
      total,
      correct: runState.correct,
      score,
      durationMinutes,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    renderSharedData(state, getStats(state));

    runPanel.classList.add("hidden");
    resultPanel.classList.remove("hidden");
    resultScore.textContent = `${score}%`;
    resultCorrect.textContent = String(runState.correct);
    resultTotal.textContent = String(total);
  });

  restartBtn.addEventListener("click", () => {
    setupPanel.classList.remove("hidden");
    resultPanel.classList.add("hidden");
  });
}

function setupProgress(state) {
  const topicBreakdown = document.getElementById("progress-topic-breakdown");
  const sessionList = document.getElementById("progress-session-list");
  if (!topicBreakdown || !sessionList) return;

  const topics = getTopicCounts(state.flashcards);
  const maxCount = topics.length > 0 ? topics[0].count : 1;
  if (topics.length === 0) {
    renderEmptyMessage(topicBreakdown, "No flashcards yet.");
  } else {
    topicBreakdown.innerHTML = topics
      .map(
        (topic) => `
          <div class="topic-row">
            <div class="topic-line">
              <span>${topic.topic}</span>
              <strong>${topic.count}</strong>
            </div>
            <div class="topic-track"><div class="topic-fill" style="width:${
              (topic.count / maxCount) * 100
            }%"></div></div>
          </div>
        `,
      )
      .join("");
  }

  const sessions = [...state.sessions].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  if (sessions.length === 0) {
    renderEmptyMessage(sessionList, "No sessions recorded yet.");
  } else {
    sessionList.innerHTML = sessions
      .map(
        (session) => `
          <div class="metric-row">
            <span>${formatDate(session.createdAt)} - ${session.durationMinutes} min</span>
            <strong>${session.correct}/${session.total} (${session.score}%)</strong>
          </div>
        `,
      )
      .join("");
  }
}

function init() {
  const state = loadState();
  const stats = getStats(state);
  renderNavActive();
  renderSharedData(state, stats);

  const page = document.body.dataset.page;
  if (page === "dashboard") setupDashboard(state);
  if (page === "flashcards") setupFlashcards(state);
  if (page === "practice") setupPractice(state);
  if (page === "progress") setupProgress(state);
}

window.addEventListener("DOMContentLoaded", init);
