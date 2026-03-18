const API_BASE = window.location.origin;
const DEFAULT_PROFILE = {
  studentName: "Student",
  gradeLevel: "High School",
  favoriteSubject: "General Study",
  learningStyle: "Visual",
  dailyGoalMinutes: 30,
  studyDaysPerWeek: 5,
  themePreference: "Ocean",
  focusMode: false,
  bio: "",
};

let appState = {
  profile: { ...DEFAULT_PROFILE },
  flashcards: [],
  sessions: [],
};

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${endpoint} (${response.status})`);
  }

  return response.json();
}

async function loadData() {
  try {
    const [profile, flashcards, sessions] = await Promise.all([
      apiRequest("/api/profile"),
      apiRequest("/api/flashcards"),
      apiRequest("/api/sessions"),
    ]);

    appState.profile = { ...DEFAULT_PROFILE, ...profile };
    appState.flashcards = flashcards;
    appState.sessions = sessions;
  } catch (error) {
    console.error("Failed to load initial data:", error);
  }

  return appState;
}

async function saveFlashcard(flashcardData) {
  const saved = await apiRequest("/api/flashcards", {
    method: "POST",
    body: JSON.stringify(flashcardData),
  });
  appState.flashcards.unshift(saved);
  return saved;
}

async function updateFlashcard(id, flashcardData) {
  const updated = await apiRequest(`/api/flashcards/${id}`, {
    method: "PUT",
    body: JSON.stringify(flashcardData),
  });
  appState.flashcards = appState.flashcards.map((card) =>
    String(card.id) === String(id) ? updated : card,
  );
  return updated;
}

async function deleteFlashcard(id) {
  await apiRequest(`/api/flashcards/${id}`, {
    method: "DELETE",
  });
  appState.flashcards = appState.flashcards.filter(
    (card) => String(card.id) !== String(id),
  );
}

async function reviewFlashcard(id, result) {
  const updated = await apiRequest(`/api/flashcards/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ result }),
  });
  appState.flashcards = appState.flashcards.map((card) =>
    String(card.id) === String(id) ? updated : card,
  );
  return updated;
}

async function saveSession(sessionData) {
  const saved = await apiRequest("/api/sessions", {
    method: "POST",
    body: JSON.stringify(sessionData),
  });
  appState.sessions.unshift(saved);
  return saved;
}

async function updateProfile(profileData) {
  const updated = await apiRequest("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
  appState.profile = { ...DEFAULT_PROFILE, ...updated };
  return updated;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(isoDate) {
  if (!isoDate) return "Not set";
  return new Date(isoDate).toLocaleDateString();
}

function formatDateTime(isoDate) {
  if (!isoDate) return "Not set";
  return new Date(isoDate).toLocaleString();
}

function formatModeLabel(mode) {
  const labels = {
    flashcard: "Flip Flashcards",
    written: "Written Recall",
    "multiple-choice": "Multiple Choice",
    "true-false": "True / False",
    "boss-battle": "Boss Battle",
  };
  return labels[mode] || "Written Recall";
}

function isCardDue(card) {
  if (!card.nextReviewAt) return true;
  return new Date(card.nextReviewAt) <= new Date();
}

function getTopicCounts(cards) {
  const counts = {};
  cards.forEach((card) => {
    const key = card.topic || "General";
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));
}

function getCurrentStreak(sessions) {
  const daySet = new Set(
    sessions.map((session) => new Date(session.createdAt).toDateString()),
  );

  let streak = 0;
  const cursor = new Date();
  while (daySet.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLevelData(sessions) {
  const xp = sessions.reduce(
    (sum, session) => sum + (Number(session.xpEarned) || 0),
    0,
  );
  const level = Math.floor(xp / 120) + 1;
  return {
    xp,
    level,
  };
}

function getGoalProgress(state) {
  const today = new Date().toDateString();
  const todayMinutes = state.sessions
    .filter((session) => new Date(session.createdAt).toDateString() === today)
    .reduce((sum, session) => sum + (Number(session.durationMinutes) || 0), 0);
  const goal = Number(state.profile.dailyGoalMinutes) || 1;
  return {
    todayMinutes,
    percentage: Math.min(100, Math.round((todayMinutes / goal) * 100)),
  };
}

function getProfileCompletion(profile) {
  const checks = [
    profile.studentName && profile.studentName !== "Student",
    profile.gradeLevel,
    profile.favoriteSubject,
    profile.learningStyle,
    profile.dailyGoalMinutes,
    profile.studyDaysPerWeek,
    profile.themePreference,
    profile.bio,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getStats(state) {
  const sessions = state.sessions;
  const flashcards = state.flashcards;
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
  const dueCards = flashcards.filter(isCardDue).length;
  const masteredCards = flashcards.filter(
    (card) => Number(card.masteryLevel) >= 80,
  ).length;
  const weakCards = flashcards.filter(
    (card) =>
      Number(card.wrongCount) > Number(card.correctCount) ||
      Number(card.masteryLevel) < 40,
  ).length;
  const levelData = getLevelData(sessions);

  return {
    streak: getCurrentStreak(sessions),
    totalCards: flashcards.length,
    totalSessions: sessions.length,
    totalMinutes,
    avgScore,
    bestScore,
    dueCards,
    masteredCards,
    weakCards,
    xp: levelData.xp,
    level: levelData.level,
  };
}

function getTopTopic(cards) {
  const [first] = getTopicCounts(cards);
  return first ? first.topic : "No topic yet";
}

function getWeakCards(cards) {
  return [...cards]
    .sort((a, b) => {
      const aScore =
        Number(a.wrongCount) * 8 -
        Number(a.correctCount) * 2 -
        Number(a.masteryLevel);
      const bScore =
        Number(b.wrongCount) * 8 -
        Number(b.correctCount) * 2 -
        Number(b.masteryLevel);
      return bScore - aScore;
    })
    .slice(0, 5);
}

function getRecentMissedTopics(sessions) {
  const recent = sessions.slice(0, 10);
  const counts = {};
  recent.forEach((session) => {
    const topics = Array.isArray(session.missedTopics) ? session.missedTopics : [];
    topics.forEach((topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
}

function getWeeklyActivity(sessions) {
  const items = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const dayKey = day.toDateString();
    const daySessions = sessions.filter(
      (session) => new Date(session.createdAt).toDateString() === dayKey,
    );
    items.push({
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: daySessions.reduce(
        (sum, session) => sum + (Number(session.durationMinutes) || 0),
        0,
      ),
      sessions: daySessions.length,
    });
  }
  return items;
}

function getAchievements(state) {
  const stats = getStats(state);
  return [
    {
      title: "First Steps",
      unlocked: stats.totalSessions >= 1,
      detail: "Complete your first study session",
    },
    {
      title: "Card Architect",
      unlocked: stats.totalCards >= 10,
      detail: "Build a deck of at least 10 flashcards",
    },
    {
      title: "On Fire",
      unlocked: stats.streak >= 3,
      detail: "Keep a 3-day study streak",
    },
    {
      title: "Master Mind",
      unlocked: stats.masteredCards >= 5,
      detail: "Reach mastery on 5 flashcards",
    },
    {
      title: "Century Club",
      unlocked: stats.totalMinutes >= 100,
      detail: "Study for 100 total minutes",
    },
    {
      title: "Boss Slayer",
      unlocked: state.sessions.some((session) => session.mode === "boss-battle"),
      detail: "Finish a Boss Battle practice set",
    },
  ];
}

function renderEmptyMessage(container, message) {
  container.innerHTML = `<p class="empty-state">${message}</p>`;
}

function renderBadgeList(container, achievements) {
  if (!container) return;
  if (achievements.length === 0) {
    renderEmptyMessage(container, "No achievements yet.");
    return;
  }

  container.innerHTML = achievements
    .map(
      (item) => `
        <article class="badge-card ${item.unlocked ? "unlocked" : ""}">
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </article>
      `,
    )
    .join("");
}

function renderNavActive() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".main-nav a[data-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.link === page);
  });
}

function renderSharedData(state, stats) {
  const goalProgress = getGoalProgress(state);
  const profileCompletion = getProfileCompletion(state.profile);

  document.querySelectorAll("[data-student-name]").forEach((node) => {
    node.textContent = state.profile.studentName;
  });

  [
    ["dashboard-streak", `${stats.streak} days`],
    ["dashboard-cards", String(stats.totalCards)],
    ["dashboard-accuracy", `${stats.avgScore}%`],
    ["dashboard-level", `Lv. ${stats.level}`],
    ["progress-total-sessions", String(stats.totalSessions)],
    ["progress-total-minutes", String(stats.totalMinutes)],
    ["progress-best-score", `${stats.bestScore}%`],
    ["progress-average-score", `${stats.avgScore}%`],
    ["practice-total-cards", String(stats.totalCards)],
    ["flashcard-count", String(stats.totalCards)],
    ["profile-total-sessions", String(stats.totalSessions)],
    ["profile-total-minutes", String(stats.totalMinutes)],
    ["profile-best-score", `${stats.bestScore}%`],
    ["profile-goal-progress", `${goalProgress.percentage}%`],
    ["profile-completion-text", `Profile setup ${profileCompletion}% complete`],
  ].forEach(([id, text]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  });
}

function setupDashboard(state) {
  const profileSummary = document.getElementById("dashboard-profile-summary");
  const topicList = document.getElementById("dashboard-topic-list");
  const reviewSummary = document.getElementById("dashboard-review-summary");
  const achievementList = document.getElementById("dashboard-achievement-list");
  const sessionList = document.getElementById("dashboard-session-list");

  if (
    !profileSummary ||
    !topicList ||
    !reviewSummary ||
    !achievementList ||
    !sessionList
  ) {
    return;
  }

  const stats = getStats(state);
  const goalProgress = getGoalProgress(state);
  const topicCounts = getTopicCounts(state.flashcards).slice(0, 6);
  const recentSessions = [...state.sessions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  profileSummary.innerHTML = [
    ["Study Goal", `${state.profile.dailyGoalMinutes} min daily`],
    ["Favorite Subject", state.profile.favoriteSubject],
    ["Learning Style", state.profile.learningStyle],
    ["Today's Progress", `${goalProgress.todayMinutes} min logged`],
  ]
    .map(
      ([label, value]) =>
        `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`,
    )
    .join("");

  if (topicCounts.length === 0) {
    renderEmptyMessage(topicList, "No flashcards yet.");
  } else {
    topicList.innerHTML = topicCounts
      .map(
        (item) =>
          `<div class="metric-row"><span>${item.topic}</span><strong>${item.count}</strong></div>`,
      )
      .join("");
  }

  reviewSummary.innerHTML = [
    ["Due Now", `${stats.dueCards} cards`],
    ["Mastered", `${stats.masteredCards} cards`],
    ["Need Attention", `${stats.weakCards} cards`],
    ["Total XP", `${stats.xp} XP`],
  ]
    .map(
      ([label, value]) =>
        `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`,
    )
    .join("");

  renderBadgeList(achievementList, getAchievements(state));

  if (recentSessions.length === 0) {
    renderEmptyMessage(sessionList, "No practice sessions yet.");
  } else {
    sessionList.innerHTML = recentSessions
      .map(
        (session) => `
          <div class="metric-row">
            <span>${formatDate(session.createdAt)} | ${formatModeLabel(session.mode)} | ${session.topic}</span>
            <strong>${session.score}%</strong>
          </div>
        `,
      )
      .join("");
  }
}

function setupProfile(state) {
  const profileForm = document.getElementById("profile-form");
  const settingsForm = document.getElementById("profile-settings-form");
  const status = document.getElementById("profile-status");
  const settingsSummary = document.getElementById("profile-settings-summary");
  const statsSummary = document.getElementById("profile-stats-summary");

  if (
    !profileForm ||
    !settingsForm ||
    !status ||
    !settingsSummary ||
    !statsSummary
  ) {
    return;
  }

  const fields = {
    studentName: document.getElementById("student-name"),
    gradeLevel: document.getElementById("grade-level"),
    favoriteSubject: document.getElementById("favorite-subject"),
    bio: document.getElementById("profile-bio"),
    dailyGoalMinutes: document.getElementById("daily-goal"),
    studyDaysPerWeek: document.getElementById("study-days"),
    learningStyle: document.getElementById("learning-style"),
    themePreference: document.getElementById("theme-preference"),
    focusMode: document.getElementById("focus-mode"),
  };

  function fillForm() {
    fields.studentName.value = state.profile.studentName;
    fields.gradeLevel.value = state.profile.gradeLevel;
    fields.favoriteSubject.value = state.profile.favoriteSubject;
    fields.bio.value = state.profile.bio || "";
    fields.dailyGoalMinutes.value = String(state.profile.dailyGoalMinutes);
    fields.studyDaysPerWeek.value = String(state.profile.studyDaysPerWeek);
    fields.learningStyle.value = state.profile.learningStyle;
    fields.themePreference.value = state.profile.themePreference;
    fields.focusMode.checked = Boolean(state.profile.focusMode);
  }

  function renderProfilePanels() {
    const stats = getStats(state);
    const goalProgress = getGoalProgress(state);
    const completion = getProfileCompletion(state.profile);

    settingsSummary.innerHTML = [
      ["Grade Level", state.profile.gradeLevel],
      ["Theme", state.profile.themePreference],
      ["Study Days", `${state.profile.studyDaysPerWeek} days/week`],
      ["Focus Mode", state.profile.focusMode ? "On" : "Off"],
      ["Bio", state.profile.bio || "No bio added yet"],
    ]
      .map(
        ([label, value]) =>
          `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`,
      )
      .join("");

    statsSummary.innerHTML = [
      ["Current Streak", `${stats.streak} days`],
      ["Average Score", `${stats.avgScore}%`],
      ["Deck Size", `${stats.totalCards} cards`],
      ["Top Topic", getTopTopic(state.flashcards)],
      ["Goal Progress", `${goalProgress.todayMinutes}/${state.profile.dailyGoalMinutes} min`],
      ["Completion", `${completion}%`],
    ]
      .map(
        ([label, value]) =>
          `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`,
      )
      .join("");
  }

  async function submitProfileUpdate() {
    const payload = {
      studentName: fields.studentName.value.trim() || "Student",
      gradeLevel: fields.gradeLevel.value.trim() || "High School",
      favoriteSubject: fields.favoriteSubject.value.trim() || "General Study",
      bio: fields.bio.value.trim(),
      dailyGoalMinutes: Number(fields.dailyGoalMinutes.value) || 30,
      studyDaysPerWeek: Number(fields.studyDaysPerWeek.value) || 5,
      learningStyle: fields.learningStyle.value,
      themePreference: fields.themePreference.value,
      focusMode: fields.focusMode.checked,
    };

    await updateProfile(payload);
    state.profile = appState.profile;
    renderSharedData(appState, getStats(appState));
    renderProfilePanels();
    fillForm();
  }

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await submitProfileUpdate();
      status.textContent = "Profile details saved.";
      status.className = "status-text correct";
    } catch (error) {
      status.textContent = "Failed to save profile details.";
      status.className = "status-text incorrect";
    }
  });

  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await submitProfileUpdate();
      status.textContent = "Study settings saved.";
      status.className = "status-text correct";
    } catch (error) {
      status.textContent = "Failed to save study settings.";
      status.className = "status-text incorrect";
    }
  });

  fillForm();
  renderProfilePanels();
}

function setupFlashcards(state) {
  const form = document.getElementById("flashcard-form");
  const formTitle = document.getElementById("flashcard-form-title");
  const cancelEditBtn = document.getElementById("flashcard-cancel-edit");
  const list = document.getElementById("flashcard-list");
  const search = document.getElementById("flashcard-search");
  const difficultyFilter = document.getElementById("flashcard-filter-difficulty");
  const sortSelect = document.getElementById("flashcard-sort");
  const dueOnly = document.getElementById("flashcard-due-only");
  const status = document.getElementById("flashcard-status");

  if (
    !form ||
    !formTitle ||
    !cancelEditBtn ||
    !list ||
    !search ||
    !difficultyFilter ||
    !sortSelect ||
    !dueOnly ||
    !status
  ) {
    return;
  }

  const topicInput = document.getElementById("card-topic");
  const questionInput = document.getElementById("card-question");
  const answerInput = document.getElementById("card-answer");
  const difficultyInput = document.getElementById("card-difficulty");
  const tagsInput = document.getElementById("card-tags");
  let editingId = null;

  function resetForm() {
    form.reset();
    difficultyInput.value = "medium";
    editingId = null;
    formTitle.textContent = "Add Flashcard";
    cancelEditBtn.classList.add("hidden");
  }

  function sortCards(cards) {
    const items = [...cards];
    if (sortSelect.value === "oldest") {
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortSelect.value === "due") {
      items.sort(
        (a, b) =>
          new Date(a.nextReviewAt || a.createdAt) -
          new Date(b.nextReviewAt || b.createdAt),
      );
    } else if (sortSelect.value === "mastery-low") {
      items.sort((a, b) => Number(a.masteryLevel) - Number(b.masteryLevel));
    } else if (sortSelect.value === "mastery-high") {
      items.sort((a, b) => Number(b.masteryLevel) - Number(a.masteryLevel));
    } else {
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return items;
  }

  function renderCards() {
    const term = search.value.trim().toLowerCase();
    let cards = state.flashcards.filter((card) => {
      const haystack =
        `${card.topic} ${card.question} ${card.answer} ${card.tags || ""}`.toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesDifficulty =
        difficultyFilter.value === "all" ||
        card.difficulty === difficultyFilter.value;
      const matchesDue = !dueOnly.checked || isCardDue(card);
      return matchesSearch && matchesDifficulty && matchesDue;
    });

    cards = sortCards(cards);

    if (cards.length === 0) {
      renderEmptyMessage(list, "No cards match the current filters.");
      return;
    }

    list.innerHTML = cards
      .map((card) => {
        const tags = String(card.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        return `
          <article class="flashcard-item" data-id="${card.id}">
            <div class="flashcard-item-header">
              <div class="flashcard-title-group">
                <span class="pill">${card.topic}</span>
                <span class="pill subtle">${card.difficulty}</span>
              </div>
              <div class="card-actions">
                <button class="ghost-btn small" type="button" data-action="edit">Edit</button>
                <button class="danger-btn" type="button" data-action="delete">Delete</button>
              </div>
            </div>
            <h3>${card.question}</h3>
            <p class="muted">Answer: ${card.answer}</p>
            <div class="chip-list">
              ${tags.length > 0 ? tags.map((tag) => `<span class="chip">${tag}</span>`).join("") : '<span class="chip">No tags</span>'}
            </div>
            <div class="mastery-block">
              <div class="topic-line">
                <span>Mastery</span>
                <strong>${card.masteryLevel || 0}%</strong>
              </div>
              <div class="topic-track"><div class="topic-fill" style="width:${card.masteryLevel || 0}%"></div></div>
            </div>
            <p class="meta">
              Due: ${formatDateTime(card.nextReviewAt)} | Reviews: ${card.reviewCount || 0} | Correct: ${card.correctCount || 0} | Wrong: ${card.wrongCount || 0}
            </p>
          </article>
        `;
      })
      .join("");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      topic: topicInput.value.trim(),
      question: questionInput.value.trim(),
      answer: answerInput.value.trim(),
      difficulty: difficultyInput.value,
      tags: tagsInput.value.trim(),
    };

    if (!payload.topic || !payload.question || !payload.answer) {
      status.textContent = "Topic, question, and answer are required.";
      status.className = "status-text incorrect";
      return;
    }

    try {
      if (editingId) {
        await updateFlashcard(editingId, payload);
        status.textContent = "Flashcard updated.";
      } else {
        await saveFlashcard(payload);
        status.textContent = "Flashcard added.";
      }
      status.className = "status-text correct";
      renderSharedData(appState, getStats(appState));
      renderCards();
      resetForm();
    } catch (error) {
      status.textContent = "Failed to save flashcard.";
      status.className = "status-text incorrect";
    }
  });

  cancelEditBtn.addEventListener("click", resetForm);

  [search, difficultyFilter, sortSelect, dueOnly].forEach((node) => {
    node.addEventListener("input", renderCards);
    node.addEventListener("change", renderCards);
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const cardNode = button.closest("[data-id]");
    if (!cardNode) return;
    const card = state.flashcards.find(
      (item) => String(item.id) === String(cardNode.dataset.id),
    );
    if (!card) return;

    if (button.dataset.action === "edit") {
      editingId = card.id;
      formTitle.textContent = "Edit Flashcard";
      cancelEditBtn.classList.remove("hidden");
      topicInput.value = card.topic;
      questionInput.value = card.question;
      answerInput.value = card.answer;
      difficultyInput.value = card.difficulty || "medium";
      tagsInput.value = card.tags || "";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (button.dataset.action === "delete") {
      try {
        await deleteFlashcard(card.id);
        renderSharedData(appState, getStats(appState));
        renderCards();
        status.textContent = "Flashcard deleted.";
        status.className = "status-text correct";
        if (editingId && String(editingId) === String(card.id)) {
          resetForm();
        }
      } catch (error) {
        status.textContent = "Failed to delete flashcard.";
        status.className = "status-text incorrect";
      }
    }
  });

  resetForm();
  renderCards();
}

function setupPractice(state) {
  const emptyPanel = document.getElementById("practice-empty");
  const setupPanel = document.getElementById("practice-setup");
  const runPanel = document.getElementById("practice-run");
  const resultPanel = document.getElementById("practice-result");
  const setupForm = document.getElementById("practice-setup-form");
  const countInput = document.getElementById("practice-question-count");
  const modeInput = document.getElementById("practice-mode");
  const topicFilter = document.getElementById("practice-topic-filter");
  const dueOnly = document.getElementById("practice-due-only");
  const hardOnly = document.getElementById("practice-hard-only");
  const randomOrder = document.getElementById("practice-random-order");
  const progress = document.getElementById("practice-progress");
  const question = document.getElementById("practice-question");
  const prompt = document.getElementById("practice-prompt");
  const flashcardModePanel = document.getElementById("practice-flashcard-mode");
  const flipCard = document.getElementById("practice-flashcard");
  const flipFront = document.getElementById("practice-flashcard-front");
  const flipBack = document.getElementById("practice-flashcard-back");
  const flipHint = document.getElementById("practice-flashcard-hint");
  const flipTopic = document.getElementById("practice-flashcard-topic");
  const flipBtn = document.getElementById("practice-flip");
  const markWrongBtn = document.getElementById("practice-mark-wrong");
  const markRightBtn = document.getElementById("practice-mark-right");
  const flashcardNextBtn = document.getElementById("practice-flashcard-next");
  const answerForm = document.getElementById("practice-answer-form");
  const writtenArea = document.getElementById("practice-written-area");
  const answer = document.getElementById("practice-answer");
  const options = document.getElementById("practice-options");
  const submitBtn = document.getElementById("practice-submit");
  const overrideCorrectBtn = document.getElementById("practice-override-correct");
  const nextBtn = document.getElementById("practice-next");
  const feedback = document.getElementById("practice-feedback");
  const topicPill = document.getElementById("practice-topic-pill");
  const modePill = document.getElementById("practice-mode-pill");
  const resultScore = document.getElementById("practice-result-score");
  const resultCorrect = document.getElementById("practice-result-correct");
  const resultTotal = document.getElementById("practice-result-total");
  const resultXp = document.getElementById("practice-result-xp");
  const resultMode = document.getElementById("practice-result-mode");
  const resultConfidence = document.getElementById("practice-result-confidence");
  const resultReviewed = document.getElementById("practice-result-reviewed");
  const resultMissed = document.getElementById("practice-result-missed");
  const restartBtn = document.getElementById("practice-restart");

  if (
    !emptyPanel ||
    !setupPanel ||
    !runPanel ||
    !resultPanel ||
    !setupForm ||
    !countInput ||
    !modeInput ||
    !topicFilter ||
    !dueOnly ||
    !hardOnly ||
    !randomOrder ||
    !progress ||
    !question ||
    !prompt ||
    !flashcardModePanel ||
    !flipCard ||
    !flipFront ||
    !flipBack ||
    !flipHint ||
    !flipTopic ||
    !flipBtn ||
    !markWrongBtn ||
    !markRightBtn ||
    !flashcardNextBtn ||
    !answerForm ||
    !writtenArea ||
    !answer ||
    !options ||
    !submitBtn ||
    !overrideCorrectBtn ||
    !nextBtn ||
    !feedback ||
    !topicPill ||
    !modePill ||
    !resultScore ||
    !resultCorrect ||
    !resultTotal ||
    !resultXp ||
    !resultMode ||
    !resultConfidence ||
    !resultReviewed ||
    !resultMissed ||
    !restartBtn
  ) {
    return;
  }

  const topics = [...new Set(state.flashcards.map((card) => card.topic).filter(Boolean))];
  topicFilter.innerHTML =
    '<option value="all">All topics</option>' +
    topics.map((topic) => `<option value="${topic}">${topic}</option>`).join("");

  if (state.flashcards.length === 0) {
    emptyPanel.classList.remove("hidden");
    setupPanel.classList.add("hidden");
    return;
  }

  let runState = null;

  function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function getSessionPool() {
    let pool = [...appState.flashcards];
    if (topicFilter.value !== "all") {
      pool = pool.filter((card) => card.topic === topicFilter.value);
    }
    if (dueOnly.checked) {
      pool = pool.filter(isCardDue);
    }
    if (hardOnly.checked) {
      pool = pool.filter((card) => card.difficulty === "hard");
    }
    if (modeInput.value === "boss-battle") {
      pool = pool.filter(
        (card) =>
          card.difficulty === "hard" ||
          Number(card.masteryLevel) < 50 ||
          isCardDue(card),
      );
    }
    return pool;
  }

  function buildMultipleChoice(card, pool) {
    const distractors = shuffle(
      pool.filter((item) => item.id !== card.id && item.answer !== card.answer),
    )
      .slice(0, 3)
      .map((item) => item.answer);
    return {
      question: card.question,
      prompt: "Pick the best answer.",
      choices: shuffle([card.answer, ...distractors]).slice(0, 4),
      correctValue: card.answer,
      type: "multiple-choice",
    };
  }

  function buildTrueFalse(card, pool) {
    const useCorrect = Math.random() > 0.5 || pool.length < 2;
    let statementAnswer = card.answer;
    if (!useCorrect) {
      const distractor = shuffle(
        pool.filter((item) => item.id !== card.id && item.answer !== card.answer),
      )[0];
      if (distractor) statementAnswer = distractor.answer;
    }

    return {
      question: `${card.question} ${statementAnswer}`,
      prompt: "Decide whether the statement is accurate.",
      choices: ["True", "False"],
      correctValue: useCorrect ? "True" : "False",
      type: "true-false",
    };
  }

  function getQuestionType(mode, index) {
    if (mode === "boss-battle") {
      return index % 2 === 0 ? "multiple-choice" : "written";
    }
    return mode;
  }

  function createPromptItem(card, pool, mode, index) {
    const questionType = getQuestionType(mode, index);
    if (questionType === "flashcard") {
      return {
        question: card.question,
        prompt: "Read the front, flip the card, and mark whether you knew it.",
        choices: [],
        correctValue: card.answer,
        type: "flashcard",
      };
    }
    if (questionType === "multiple-choice") return buildMultipleChoice(card, pool);
    if (questionType === "true-false") return buildTrueFalse(card, pool);
    return {
      question: card.question,
      prompt: "Type the answer from memory.",
      choices: [],
      correctValue: card.answer,
      type: "written",
    };
  }

  function renderOptions(promptItem) {
    if (!promptItem.choices || promptItem.choices.length === 0) {
      options.classList.add("hidden");
      options.innerHTML = "";
      return;
    }

    options.classList.remove("hidden");
    options.innerHTML = promptItem.choices
      .map(
        (choice) => `
          <button class="option-btn ${runState.selectedOption === choice ? "selected" : ""}" type="button" data-choice="${choice}">
            ${choice}
          </button>
        `,
      )
      .join("");
  }

  function renderQuestion() {
    const currentCard = runState.cards[runState.currentIndex];
    runState.promptItem = createPromptItem(
      currentCard,
      runState.cards,
      runState.mode,
      runState.currentIndex,
    );
    runState.selectedOption = "";
    runState.answered = false;
    runState.pendingReview = null;

    progress.textContent = `Question ${runState.currentIndex + 1} of ${runState.cards.length}`;
    question.textContent = runState.promptItem.question;
    prompt.textContent = runState.promptItem.prompt;
    topicPill.textContent = currentCard.topic || "General";
    modePill.textContent = formatModeLabel(runState.promptItem.type);
    feedback.textContent = "";
    feedback.className = "status-text";
    nextBtn.classList.add("hidden");
    overrideCorrectBtn.classList.add("hidden");
    flipCard.classList.remove("is-flipped");
    markWrongBtn.classList.add("hidden");
    markRightBtn.classList.add("hidden");
    flashcardNextBtn.classList.add("hidden");

    if (runState.promptItem.type === "flashcard") {
      flashcardModePanel.classList.remove("hidden");
      answerForm.classList.add("hidden");
      submitBtn.classList.add("hidden");
      flipBtn.classList.remove("hidden");
      flipFront.textContent = currentCard.question;
      flipBack.textContent = currentCard.answer;
      flipHint.textContent =
        currentCard.difficulty === "hard"
          ? "Hard card. Take an extra second before flipping."
          : "Try to answer out loud before you flip.";
      flipTopic.textContent = `Topic: ${currentCard.topic || "General"} | Difficulty: ${currentCard.difficulty || "medium"}`;
      question.textContent = "Flashcard Review";
      prompt.textContent = runState.promptItem.prompt;
      return;
    }

    flashcardModePanel.classList.add("hidden");
    answerForm.classList.remove("hidden");
    submitBtn.classList.remove("hidden");

    if (runState.promptItem.type === "written") {
      writtenArea.classList.remove("hidden");
      answer.required = true;
      answer.value = "";
      renderOptions({ choices: [] });
    } else {
      writtenArea.classList.add("hidden");
      answer.required = false;
      answer.value = "";
      renderOptions(runState.promptItem);
    }
  }

  async function scoreFlashcardResponse(isCorrect) {
    if (!runState || runState.answered) return;

    const currentCard = runState.cards[runState.currentIndex];
    runState.answered = true;
    if (isCorrect) {
      runState.correct += 1;
      runState.confidentCount += 1;
      feedback.textContent = "Marked correct. Moving this card further out.";
      feedback.className = "status-text correct";
    } else {
      feedback.textContent = `Marked for review. Answer: ${currentCard.answer}`;
      feedback.className = "status-text incorrect";
      runState.missedCards.push(currentCard);
    }

    flipBtn.classList.add("hidden");
    markWrongBtn.classList.add("hidden");
    markRightBtn.classList.add("hidden");
    flashcardNextBtn.classList.remove("hidden");

    try {
      await reviewFlashcard(currentCard.id, isCorrect ? "correct" : "incorrect");
    } catch (error) {
      console.error("Failed to update spaced review:", error);
    }
  }

  async function scoreCurrentAnswer() {
    if (!runState || runState.answered) return;

    const currentCard = runState.cards[runState.currentIndex];
    const promptItem = runState.promptItem;
    let isCorrect = false;

    if (promptItem.type === "written") {
      const normalizedUser = normalizeText(answer.value.trim());
      const normalizedExpected = normalizeText(promptItem.correctValue);
      isCorrect =
        normalizedUser.length > 0 &&
        (normalizedUser === normalizedExpected ||
          (normalizedUser.length >= 5 &&
            normalizedExpected.includes(normalizedUser)) ||
          (normalizedExpected.length >= 5 &&
            normalizedUser.includes(normalizedExpected)));
    } else {
      isCorrect = runState.selectedOption === promptItem.correctValue;
    }

    runState.answered = true;
    if (isCorrect) {
      runState.correct += 1;
      runState.confidentCount += 1;
      feedback.textContent = "Correct.";
      feedback.className = "status-text correct";
      runState.pendingReview = {
        cardId: currentCard.id,
        result: "correct",
      };
    } else {
      feedback.textContent = `Not quite. Correct answer: ${currentCard.answer}`;
      feedback.className = "status-text incorrect";
      runState.missedCards.push(currentCard);
      runState.pendingReview = {
        cardId: currentCard.id,
        result: "incorrect",
      };
      if (promptItem.type === "written") {
        overrideCorrectBtn.classList.remove("hidden");
      }
    }

    submitBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
  }

  async function finalizePendingReview() {
    if (!runState || !runState.pendingReview) return;

    try {
      await reviewFlashcard(
        runState.pendingReview.cardId,
        runState.pendingReview.result,
      );
    } catch (error) {
      console.error("Failed to update spaced review:", error);
    } finally {
      runState.pendingReview = null;
    }
  }

  function renderResult() {
    const total = runState.cards.length;
    const score = Math.round((runState.correct / total) * 100);
    const confidence = Math.round((runState.confidentCount / total) * 100);
    const xpEarned =
      runState.correct * 12 +
      Math.round(score / 10) +
      (runState.mode === "flashcard" ? 10 : 0) +
      (runState.mode === "boss-battle" ? 20 : 0);
    const durationMinutes = Math.max(
      1,
      Math.round((Date.now() - runState.startMs) / 60000),
    );
    const missedCardIds = runState.missedCards.map((card) => card.id);
    const missedTopics = [...new Set(runState.missedCards.map((card) => card.topic))];

    saveSession({
      score,
      durationMinutes,
      totalQuestions: total,
      correctAnswers: runState.correct,
      mode: runState.mode,
      topic: runState.topic,
      xpEarned,
      missedCardIds,
      missedTopics,
    })
      .then(() => {
        renderSharedData(appState, getStats(appState));
      })
      .catch((error) => {
        console.error("Failed to save session:", error);
      });

    runPanel.classList.add("hidden");
    resultPanel.classList.remove("hidden");
    resultScore.textContent = `${score}%`;
    resultCorrect.textContent = String(runState.correct);
    resultTotal.textContent = String(total);
    resultXp.textContent = String(xpEarned);
    resultMode.textContent = formatModeLabel(runState.mode);
    resultConfidence.textContent = `${confidence}%`;
    resultReviewed.textContent = String(total);

    if (runState.missedCards.length === 0) {
      renderEmptyMessage(resultMissed, "Perfect round. No misses to review.");
    } else {
      resultMissed.innerHTML = runState.missedCards
        .map(
          (card) => `
            <div class="metric-row">
              <span>${card.topic} | ${card.question}</span>
              <strong>${card.answer}</strong>
            </div>
          `,
        )
        .join("");
    }
  }

  setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const pool = getSessionPool();
    if (pool.length === 0) {
      window.alert("No cards match the selected practice filters.");
      return;
    }

    const count = Math.max(
      1,
      Math.min(pool.length, Number(countInput.value) || 5),
    );

    runState = {
      cards: (randomOrder.checked ? shuffle(pool) : [...pool]).slice(0, count),
      currentIndex: 0,
      correct: 0,
      confidentCount: 0,
      startMs: Date.now(),
      mode: modeInput.value,
      topic: topicFilter.value === "all" ? "Mixed" : topicFilter.value,
      missedCards: [],
      selectedOption: "",
      answered: false,
      promptItem: null,
    };

    setupPanel.classList.add("hidden");
    resultPanel.classList.add("hidden");
    runPanel.classList.remove("hidden");
    renderQuestion();
  });

  options.addEventListener("click", (event) => {
    const choiceBtn = event.target.closest("[data-choice]");
    if (!choiceBtn || !runState || runState.answered) return;
    runState.selectedOption = choiceBtn.dataset.choice;
    renderOptions(runState.promptItem);
  });

  answerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (runState.promptItem.type !== "written" && !runState.selectedOption) {
      feedback.textContent = "Choose an option first.";
      feedback.className = "status-text incorrect";
      return;
    }
    await scoreCurrentAnswer();
  });

  overrideCorrectBtn.addEventListener("click", () => {
    if (
      !runState ||
      !runState.answered ||
      !runState.pendingReview ||
      runState.pendingReview.result !== "incorrect"
    ) {
      return;
    }

    const currentCard = runState.cards[runState.currentIndex];
    runState.pendingReview.result = "correct";
    runState.correct += 1;
    runState.confidentCount += 1;
    runState.missedCards = runState.missedCards.filter(
      (card) => String(card.id) !== String(currentCard.id),
    );
    feedback.textContent = "Override applied. Marked correct.";
    feedback.className = "status-text correct";
    overrideCorrectBtn.classList.add("hidden");
  });

  flipBtn.addEventListener("click", () => {
    if (!runState || runState.answered) return;
    flipCard.classList.add("is-flipped");
    flipBtn.classList.add("hidden");
    markWrongBtn.classList.remove("hidden");
    markRightBtn.classList.remove("hidden");
  });

  markWrongBtn.addEventListener("click", async () => {
    await scoreFlashcardResponse(false);
  });

  markRightBtn.addEventListener("click", async () => {
    await scoreFlashcardResponse(true);
  });

  flashcardNextBtn.addEventListener("click", async () => {
    runState.currentIndex += 1;
    if (runState.currentIndex < runState.cards.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  });

  nextBtn.addEventListener("click", async () => {
    await finalizePendingReview();
    runState.currentIndex += 1;
    if (runState.currentIndex < runState.cards.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  });

  restartBtn.addEventListener("click", () => {
    resultPanel.classList.add("hidden");
    setupPanel.classList.remove("hidden");
  });
}

function setupProgress(state) {
  const topicBreakdown = document.getElementById("progress-topic-breakdown");
  const sessionList = document.getElementById("progress-session-list");
  const weakSpots = document.getElementById("progress-weak-spots");
  const achievements = document.getElementById("progress-achievements");
  const weeklyActivity = document.getElementById("progress-weekly-activity");
  const recentMisses = document.getElementById("progress-recent-misses");

  if (
    !topicBreakdown ||
    !sessionList ||
    !weakSpots ||
    !achievements ||
    !weeklyActivity ||
    !recentMisses
  ) {
    return;
  }

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
            <div class="topic-track"><div class="topic-fill" style="width:${(topic.count / maxCount) * 100}%"></div></div>
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
            <span>${formatDate(session.createdAt)} | ${formatModeLabel(session.mode)} | ${session.topic}</span>
            <strong>${session.correctAnswers}/${session.totalQuestions} (${session.score}%)</strong>
          </div>
        `,
      )
      .join("");
  }

  const weakCards = getWeakCards(state.flashcards);
  if (weakCards.length === 0) {
    renderEmptyMessage(weakSpots, "Weak spots will appear after more reviews.");
  } else {
    weakSpots.innerHTML = weakCards
      .map(
        (card) => `
          <div class="metric-row">
            <span>${card.topic} | ${card.question}</span>
            <strong>${card.masteryLevel || 0}% mastery</strong>
          </div>
        `,
      )
      .join("");
  }

  renderBadgeList(achievements, getAchievements(state));

  weeklyActivity.innerHTML = getWeeklyActivity(state.sessions)
    .map(
      (day) => `
        <div class="metric-row">
          <span>${day.label}</span>
          <strong>${day.minutes} min | ${day.sessions} sessions</strong>
        </div>
      `,
    )
    .join("");

  const misses = getRecentMissedTopics(state.sessions);
  if (misses.length === 0) {
    renderEmptyMessage(recentMisses, "No recent missed topics.");
  } else {
    recentMisses.innerHTML = misses
      .map(
        (item) => `
          <div class="metric-row">
            <span>${item.topic}</span>
            <strong>${item.count} misses</strong>
          </div>
        `,
      )
      .join("");
  }
}

async function init() {
  await loadData();
  const stats = getStats(appState);

  renderNavActive();
  renderSharedData(appState, stats);

  const page = document.body.dataset.page;
  if (page === "dashboard") setupDashboard(appState);
  if (page === "profile") setupProfile(appState);
  if (page === "flashcards") setupFlashcards(appState);
  if (page === "practice") setupPractice(appState);
  if (page === "progress") setupProgress(appState);
}

window.addEventListener("DOMContentLoaded", init);
