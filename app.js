// ── State ──────────────────────────────────────────────────────
let currentCategory = null;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let wrongAnswers = [];

// ── DOM refs ───────────────────────────────────────────────────
const home          = document.getElementById('home');
const termList      = document.getElementById('termList');
const quizPage      = document.getElementById('quizPage');
const searchResults = document.getElementById('searchResults');
const searchInput   = document.getElementById('searchInput');

// ── Init ───────────────────────────────────────────────────────
function init() {
  renderCategories();
  document.getElementById('backBtn').addEventListener('click', showHome);
  document.getElementById('backFromQuiz').addEventListener('click', () => showTermList(currentCategory));
  document.getElementById('startTestBtn').addEventListener('click', startQuiz);
  searchInput.addEventListener('input', onSearch);
}

// ── Navigation ─────────────────────────────────────────────────
function showHome() {
  home.classList.remove('hidden');
  termList.classList.add('hidden');
  quizPage.classList.add('hidden');
  searchResults.classList.add('hidden');
  searchInput.value = '';
}

function showTermList(catId) {
  currentCategory = catId;
  const cat = CATEGORIES.find(c => c.id === catId);
  const terms = TERMS.filter(t => t.cat === catId);

  document.getElementById('termListTitle').textContent = cat.icon + ' ' + cat.name;
  renderTermCards(terms, document.getElementById('termsGrid'), cat.color);

  home.classList.add('hidden');
  searchResults.classList.add('hidden');
  quizPage.classList.add('hidden');
  termList.classList.remove('hidden');
}

// ── Render categories ──────────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = CATEGORIES.map(cat => {
    const count = TERMS.filter(t => t.cat === cat.id).length;
    return `<div class="category-card" style="--cat-color:${cat.color}" onclick="showTermList('${cat.id}')">
      <span class="icon">${cat.icon}</span>
      <div><h3>${cat.name}</h3></div>
    </div>`;
  }).join('');
}

function flipCard(card) {
  const isFlipped = card.classList.contains('flipped');
  document.querySelectorAll('.flip-card.flipped').forEach(c => c.classList.remove('flipped'));
  if (!isFlipped) card.classList.add('flipped');
}

// ── Render term cards ──────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function renderTermCards(terms, container, color) {
  const [r,g,b] = hexToRgb(color || '#4A90D9');
  const total = terms.length;
  container.innerHTML = terms.map((t, i) => {
    const alpha = 0.08 + (i / (total - 1 || 1)) * 0.18;
    const bg = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
    return `
    <div class="flip-card" onclick="flipCard(this)">
      <div class="flip-card-inner">
        <div class="flip-front" style="background:${bg}">
          <div class="en">${t.en}</div>
          <div class="zh">${t.zh}</div>
          <div class="hint">点击查看解释</div>
        </div>
        <div class="flip-back" style="--cat-color:${color || '#4A90D9'}">
          <div class="def">${t.def}</div>
          <div class="analogy">💡 ${t.analogy}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Search ─────────────────────────────────────────────────────
function onSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { showHome(); return; }

  const results = TERMS.filter(t =>
    t.en.toLowerCase().includes(q) || t.zh.toLowerCase().includes(q) || t.def.toLowerCase().includes(q)
  );

  home.classList.add('hidden');
  termList.classList.add('hidden');
  quizPage.classList.add('hidden');
  searchResults.classList.remove('hidden');

  const grid = document.getElementById('searchGrid');
  if (!results.length) {
    grid.innerHTML = '<p style="color:#6c757d">没有找到相关术语</p>';
    return;
  }
  renderTermCards(results, grid, '#4A90D9');
}

// ── Quiz ───────────────────────────────────────────────────────
function startQuiz() {
  const catTerms = TERMS.filter(t => t.cat === currentCategory);
  const pool = shuffle(catTerms).slice(0, 10);

  // 5题：看中文选英文；5题：看英文选中文
  quizQuestions = pool.map((t, i) => ({
    term: t,
    mode: i < 5 ? 'zh2en' : 'en2zh'
  }));

  quizIndex = 0; quizScore = 0; wrongAnswers = [];

  termList.classList.add('hidden');
  quizPage.classList.remove('hidden');
  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById('quizContainer');
  if (quizIndex >= quizQuestions.length) { renderResult(container); return; }

  const { term, mode } = quizQuestions[quizIndex];
  const question = mode === 'zh2en' ? term.zh : term.en;
  const answer   = mode === 'zh2en' ? term.en : term.zh;
  const qLabel   = mode === 'zh2en' ? '看中文，选英文' : '看英文，选中文';

  // 生成3个干扰项
  const distractors = shuffle(
    TERMS.filter(t => t.cat === currentCategory && t.en !== term.en)
  ).slice(0, 3).map(t => mode === 'zh2en' ? t.en : t.zh);

  const options = shuffle([answer, ...distractors]);

  container.innerHTML = `
    <div class="quiz-progress">第 ${quizIndex + 1} / ${quizQuestions.length} 题</div>
    <div class="quiz-question">
      <div class="q-label">${qLabel}</div>
      <div class="q-text">${question}</div>
    </div>
    <div class="quiz-options">
      ${options.map(opt => `
        <button class="quiz-option" onclick="checkAnswer(this, '${esc(opt)}', '${esc(answer)}')">${opt}</button>
      `).join('')}
    </div>`;
}

function checkAnswer(btn, chosen, answer) {
  const buttons = btn.parentElement.querySelectorAll('.quiz-option');
  buttons.forEach(b => {
    b.disabled = true;
    if (b.textContent === answer) b.classList.add('correct');
  });

  if (chosen === answer) {
    quizScore++;
    btn.classList.add('correct');
  } else {
    btn.classList.add('wrong');
    wrongAnswers.push(quizQuestions[quizIndex]);
  }

  setTimeout(() => { quizIndex++; renderQuestion(); }, 900);
}

function renderResult(container) {
  // 存储本次成绩
  const key = `scores_${currentCategory}`;
  const scores = JSON.parse(localStorage.getItem(key) || '[]');
  scores.push(quizScore);
  localStorage.setItem(key, JSON.stringify(scores));

  // 计算排名百分比
  const total = scores.length;
  const beaten = scores.filter(s => s < quizScore).length;
  const pct = total > 1 ? Math.round(beaten / (total - 1) * 100) : null;
  const rankHTML = pct !== null
    ? `<div class="rank-info">你超过了 <strong>${pct}%</strong> 的测试者（共 ${total} 人次）</div>`
    : `<div class="rank-info">你是第一位测试者！</div>`;

  const encouragement = quizScore === 10 ? '🎉 满分！你已经是AI术语达人了！'
    : quizScore >= 8 ? '👏 非常棒！再巩固几个就能满分！'
    : quizScore >= 6 ? '💪 不错！继续复习，进步很快！'
    : quizScore >= 4 ? '📖 加油！多翻几遍词卡，下次会更好！'
    : '🌱 别灰心，从头再来一遍，你会有惊喜的！';

  const wrongHTML = wrongAnswers.length ? `
    <div class="wrong-list">
      <h3>错题回顾（${wrongAnswers.length} 题）</h3>
      ${wrongAnswers.map(({ term }) => `
        <div class="wrong-item">
          <strong>${term.en}</strong> — ${term.zh}<br>
          <span style="font-size:.8rem;color:#6c757d">${term.def}</span>
        </div>`).join('')}
    </div>` : '';

  container.innerHTML = `
    <div class="quiz-result">
      <div class="score">${quizScore} / ${quizQuestions.length}</div>
      <div class="score-label">答对题数</div>
      <div class="encouragement">${encouragement}</div>
      ${rankHTML}
      ${wrongHTML}
      <button class="retry-btn" onclick="startQuiz()">再来一次</button>
    </div>`;
}

// ── Utils ──────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 防止引号破坏 HTML 属性
function esc(s) { return s.replace(/'/g, '&#39;').replace(/"/g, '&quot;'); }

init();
