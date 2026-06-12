const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const scoreEl = document.getElementById("score");
const themeBtn = document.getElementById("theme-btn");
const timerEl = document.getElementById("timer");
const progressFillEl = document.getElementById("progress-bar-fill");

const startScreen = document.getElementById("start-screen");
const difficultyScreen = document.getElementById("difficulty-screen");
const loadingScreen = document.getElementById("loading-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const QUESTION_TIME = 10;

let selectedCategory = null;
let selectedCategoryName = null;
let selectedDifficulty = null;
let questions = [];

let currentQuestion = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;

let timeLeft = QUESTION_TIME;
let timerInterval;

let userAnswers = [];
let totalTimeSpent = 0;

let darkMode = localStorage.getItem("darkMode");

if (darkMode === "enabled") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️";
}

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      themeBtn.textContent = "☀️";
      localStorage.setItem("darkMode", "enabled");
    } else {
      themeBtn.textContent = "🌙";
      localStorage.setItem("darkMode", "disabled");
    }
  });
}

const BEST_SCORES_KEY = "quiz_best_scores";
const RECENT_SCORES_KEY = "quiz_recent_scores";
const MAX_RECENT = 5;

function getBestScores() {
  try {
    return JSON.parse(localStorage.getItem(BEST_SCORES_KEY)) || {};
  } catch {
    return {};
  }
}

function getRecentScores() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SCORES_KEY)) || [];
  } catch {
    return [];
  }
}

function scoreKey(categoryId, difficulty) {
  return `${categoryId}_${difficulty}`;
}

function saveScoreResult({
  categoryId,
  categoryName,
  difficulty,
  score,
  accuracy,
}) {
  const bestScores = getBestScores();
  const key = scoreKey(categoryId, difficulty);
  const prevBest = bestScores[key]?.score || 0;
  const isNewBest = score > prevBest;

  bestScores[key] = {
    score: Math.max(score, prevBest),
    categoryName,
    difficulty,
  };
  localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(bestScores));

  const recent = getRecentScores();
  recent.unshift({
    categoryId,
    categoryName,
    difficulty,
    score,
    accuracy,
    rank: getRank(score),
    date: Date.now(),
  });

  if (recent.length > MAX_RECENT) {
    recent.length = MAX_RECENT;
  }

  localStorage.setItem(RECENT_SCORES_KEY, JSON.stringify(recent));

  return isNewBest;
}

function getCategoryBest(categoryId) {
  const bestScores = getBestScores();
  let best = 0;

  ["easy", "medium", "hard"].forEach((diff) => {
    const entry = bestScores[scoreKey(categoryId, diff)];
    if (entry && entry.score > best) {
      best = entry.score;
    }
  });

  return best;
}

function renderHomeScreen() {
  document.querySelectorAll(".category-btn").forEach((btn) => {
    const id = btn.dataset.id;
    const best = getCategoryBest(id);
    const badge = btn.querySelector(".best-badge");

    if (badge) {
      badge.textContent = best > 0 ? `🏆 Best: ${best}` : "";
    }
  });

  renderRecentScores();
}

function renderRecentScores() {
  const list = document.getElementById("recent-scores-list");
  if (!list) return;

  const recent = getRecentScores();

  if (recent.length === 0) {
    list.innerHTML = `<div class="no-scores">No quizzes played yet. Start one above!</div>`;
    return;
  }

  list.innerHTML = recent
    .map(
      (entry, i) => `
        <div class="recent-score-item" style="animation-delay:${i * 0.05}s">
            <div class="recent-score-left">
                <span class="recent-score-cat">${entry.categoryName}</span>
                <span class="recent-score-meta">${entry.difficulty} • ${entry.accuracy}% accuracy</span>
            </div>
            <div class="recent-score-right">
                <span class="recent-score-points">${entry.score}</span>
                <span class="recent-score-rank">${entry.rank.split(" ")[0]}</span>
            </div>
        </div>
    `,
    )
    .join("");
}

function renderDifficultyScreen(categoryName) {
  const title = document.getElementById("difficulty-title");
  if (title) {
    title.textContent = `${categoryName} — Select Difficulty`;
  }

  const bestScores = getBestScores();

  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    const level = btn.dataset.level;
    const entry = bestScores[scoreKey(selectedCategory, level)];
    const bestEl = btn.querySelector(".diff-best");

    if (bestEl) {
      bestEl.textContent = entry ? `🏆 ${entry.score}` : "";
    }
  });
}

function initBackgroundAnimation() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || typeof anime === "undefined") return;

  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const PARTICLE_COUNT = 28;
  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 40 + Math.random() * 90,
      hue: Math.random() > 0.5 ? "99,102,241" : "236,72,153",
      opacity: 0.05 + Math.random() * 0.08,
    });
  }

  particles.forEach((p) => {
    const targetX = Math.random() * canvas.width;
    const targetY = Math.random() * canvas.height;

    anime({
      targets: p,
      x: targetX,
      y: targetY,
      duration: 15000 + Math.random() * 10000,
      easing: "easeInOutSine",
      direction: "alternate",
      loop: true,
    });
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gradient.addColorStop(0, `rgba(${p.hue},${p.opacity})`);
      gradient.addColorStop(1, `rgba(${p.hue},0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  draw();
}

initBackgroundAnimation();

let audioCtx;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  return audioCtx;
}

function playTone(
  frequency,
  duration,
  type = "sine",
  startTime = 0,
  volume = 0.2,
) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  const now = ctx.currentTime + startTime;

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

function playCorrectSound() {
  playTone(523.25, 0.15, "triangle", 0);
  playTone(659.25, 0.15, "triangle", 0.1);
  playTone(783.99, 0.25, "triangle", 0.2);
}

function playWrongSound() {
  playTone(220, 0.25, "sawtooth", 0, 0.15);
  playTone(160, 0.35, "sawtooth", 0.12, 0.15);
}

function playCountdownSound() {
  playTone(880, 0.1, "square", 0, 0.12);
}

function playVictorySound() {
  playTone(523.25, 0.18, "triangle", 0);
  playTone(659.25, 0.18, "triangle", 0.15);
  playTone(783.99, 0.18, "triangle", 0.3);
  playTone(1046.5, 0.4, "triangle", 0.45);
}

function switchScreen(fromEl, toEl) {
  fromEl.classList.add("leaving");

  setTimeout(() => {
    fromEl.classList.remove("active", "leaving");
    toEl.classList.add("active");
  }, 300);
}

document.addEventListener("click", (e) => {
  getAudioCtx();

  const btn = e.target.closest("button");
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height);

  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

document.querySelectorAll(".category-btn").forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.id;
    selectedCategoryName = button.dataset.name;

    renderDifficultyScreen(selectedCategoryName);

    switchScreen(startScreen, difficultyScreen);
  });
});

const backToCategoriesBtn = document.getElementById("back-to-categories");
if (backToCategoriesBtn) {
  backToCategoriesBtn.addEventListener("click", () => {
    switchScreen(difficultyScreen, startScreen);
    renderHomeScreen();
  });
}

document.querySelectorAll(".difficulty-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    selectedDifficulty = button.dataset.level;

    switchScreen(difficultyScreen, loadingScreen);

    await loadQuestions();

    loadingScreen.classList.remove("active");
    quizScreen.classList.add("active");

    startQuiz();
  });
});

const restartBtn = document.getElementById("restart-btn");
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    switchScreen(resultScreen, startScreen);
    renderHomeScreen();
  });
}

renderHomeScreen();

async function loadQuestions() {
  try {
    const response = await fetch(
      `https://opentdb.com/api.php?amount=15&category=${selectedCategory}&difficulty=${selectedDifficulty}&type=multiple`,
    );

    const data = await response.json();

    questions = data.results.map((q) => {
      const answers = [...q.incorrect_answers, q.correct_answer];

      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }

      const decodedAnswers = answers.map(decodeHTML);

      return {
        question: decodeHTML(q.question),
        options: decodedAnswers,
        answer: decodedAnswers.indexOf(decodeHTML(q.correct_answer)),
      };
    });
  } catch (error) {
    console.error(error);
  }
}

function decodeHTML(text) {
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
}

function startQuiz() {
  currentQuestion = 0;
  score = 0;
  streak = 0;
  maxStreak = 0;

  userAnswers = [];
  totalTimeSpent = 0;

  loadQuestion();
}

function loadQuestion() {
  const question = questions[currentQuestion];

  questionEl.style.animation = "none";
  requestAnimationFrame(() => {
    questionEl.style.animation = "";
  });

  questionEl.textContent = question.question;

  optionsEl.innerHTML = "";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");

    button.textContent = option;
    button.classList.add("option-btn");
    button.style.animationDelay = `${0.05 + index * 0.05}s`;

    button.addEventListener("click", () => {
      checkAnswer(index, button);
    });

    optionsEl.appendChild(button);
  });

  scoreEl.textContent = `Score: ${score}`;

  updateProgressBar();
  startTimer();
}

function updateProgressBar() {
  if (!progressFillEl) return;

  const pct = (currentQuestion / questions.length) * 100;
  progressFillEl.style.width = `${pct}%`;
}

function startTimer() {
  clearInterval(timerInterval);

  timeLeft = QUESTION_TIME;

  timerEl.textContent = timeLeft;
  timerEl.classList.remove("urgent");

  timerInterval = setInterval(() => {
    timeLeft--;

    timerEl.textContent = timeLeft;

    if (timeLeft <= 3) {
      timerEl.style.color = "#ef4444";
      timerEl.style.borderColor = "#ef4444";
      timerEl.classList.add("urgent");

      if (timeLeft > 0) {
        playCountdownSound();
      }
    } else {
      timerEl.style.color = "";
      timerEl.style.borderColor = "";
      timerEl.classList.remove("urgent");
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeUp();
    }
  }, 1000);
}

function handleTimeUp() {
  const correctIndex = questions[currentQuestion].answer;

  userAnswers.push({
    question: questions[currentQuestion].question,
    selected: "No Answer",
    correct:
      questions[currentQuestion].options[questions[currentQuestion].answer],
    isCorrect: false,
  });

  streak = 0;

  const buttons = optionsEl.querySelectorAll(".option-btn");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIndex) {
      btn.classList.add("correct");
    }
  });

  showFloatingFeedback("⏰");
  playWrongSound();

  setTimeout(() => {
    currentQuestion++;

    if (currentQuestion < questions.length) {
      loadQuestion();
    } else {
      showResults();
    }
  }, 700);
}

function checkAnswer(selectedIndex, clickedButton) {
  clearInterval(timerInterval);

  const correctAnswer = questions[currentQuestion].answer;

  const timeUsed = QUESTION_TIME - timeLeft;

  totalTimeSpent += timeUsed;

  const isCorrect = selectedIndex === correctAnswer;

  userAnswers.push({
    question: questions[currentQuestion].question,

    selected: questions[currentQuestion].options[selectedIndex],

    correct: questions[currentQuestion].options[correctAnswer],

    isCorrect,
  });

  const buttons = optionsEl.querySelectorAll(".option-btn");
  buttons.forEach((btn, i) => {
    btn.disabled = true;

    if (i === correctAnswer) {
      btn.classList.add("correct");
    } else if (i === selectedIndex && !isCorrect) {
      btn.classList.add("wrong");
    }
  });

  if (isCorrect) {
    streak++;

    maxStreak = Math.max(maxStreak, streak);

    score += 10 + streak * 2;

    showFloatingFeedback("🎉");
    bumpScore();
    playCorrectSound();

    if (streak >= 2) {
      showStreakBadge();
    }
  } else {
    streak = 0;
    showFloatingFeedback("❌");
    playWrongSound();
  }

  currentQuestion++;

  setTimeout(() => {
    if (currentQuestion < questions.length) {
      loadQuestion();
    } else {
      showResults();
    }
  }, 700);
}

function showNewBestBanner() {
  const el = document.createElement("div");
  el.className = "new-best-banner";
  el.textContent = "✨ New Best Score!";

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 2200);
}

function bumpScore() {
  scoreEl.classList.remove("bump");
  requestAnimationFrame(() => {
    scoreEl.classList.add("bump");
  });
}

function showFloatingFeedback(emoji) {
  const el = document.createElement("div");
  el.className = "floating-feedback";
  el.textContent = emoji;

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1000);
}

function showStreakBadge() {
  const el = document.createElement("div");
  el.className = "streak-badge";
  el.textContent = `🔥 ${streak} in a row!`;

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1400);
}

function showResults() {
  updateProgressBar();

  switchScreen(quizScreen, resultScreen);

  const correctAnswers = userAnswers.filter(
    (answer) => answer.isCorrect,
  ).length;

  const accuracy = Math.round((correctAnswers / questions.length) * 100);

  const avgTime = (totalTimeSpent / questions.length).toFixed(1);

  animateCountUp(document.getElementById("final-score"), score, "Score: ");

  animateCountUp(
    document.getElementById("accuracy"),
    accuracy,
    "Accuracy: ",
    "%",
  );

  document.getElementById("avg-time").textContent = `Avg Time: ${avgTime}s`;

  animateCountUp(
    document.getElementById("best-streak"),
    maxStreak,
    "Best Streak: ",
  );

  document.getElementById("rank").textContent = getRank(score);

  const isNewBest = saveScoreResult({
    categoryId: selectedCategory,
    categoryName: selectedCategoryName,
    difficulty: selectedDifficulty,
    score,
    accuracy,
  });

  if (isNewBest) {
    showNewBestBanner();
  }

  generateReviewCards();

  if (accuracy >= 50) {
    playVictorySound();
    setTimeout(() => launchConfetti(), 400);
  }
}

function animateCountUp(el, target, prefix = "", suffix = "") {
  const duration = 800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.round(progress * target);

    el.textContent = `${prefix}${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function launchConfetti() {
  const colors = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#3b82f6"];
  const count = 60;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = piece.style.height = `${6 + Math.random() * 8}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";

    const duration = 2.5 + Math.random() * 2;
    const delay = Math.random() * 0.5;

    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${delay}s`;

    document.body.appendChild(piece);

    setTimeout(() => piece.remove(), (duration + delay) * 1000 + 100);
  }
}

function generateReviewCards() {
  const container = document.getElementById("review-container");

  container.innerHTML = "";

  userAnswers.forEach((answer, i) => {
    const card = document.createElement("div");

    card.className = answer.isCorrect
      ? "review-card correct"
      : "review-card wrong";

    card.style.animationDelay = `${i * 0.05}s`;

    card.innerHTML = `
            <h3>${answer.question}</h3>

            <p>
                <strong>Your Answer:</strong>
                ${answer.selected}
            </p>

            <p>
                <strong>Correct Answer:</strong>
                ${answer.correct}
            </p>
        `;

    container.appendChild(card);
  });
}
function getRank(score) {
  if (score >= 250) return "🏆 Master";

  if (score >= 180) return "🥇 Gold";

  if (score >= 120) return "🥈 Silver";

  return "🥉 Bronze";
}
