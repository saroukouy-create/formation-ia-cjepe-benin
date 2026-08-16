/* ===================================================================
   CJEPE-BENIN — Formation Expert en IA
   Logique dynamique : navigation, quiz, TP, progression, certificat
   =================================================================== */

const STORAGE_KEY = 'cjepe_ia_progress_v1';
const TOTAL_MODULES = 8;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveProgress(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getModuleState(state, id) {
  if (!state[id]) state[id] = { tp: false, quizPassed: false, quizScore: 0 };
  return state[id];
}

function isModuleComplete(m) {
  return !!(m && m.tp && m.quizPassed);
}

/* ---------------- Sidebar / navigation ---------------- */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}

function initScrollSpy() {
  const modules = document.querySelectorAll('.module, .hero-course, .hybrid-section');
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  if (!modules.length || !navItems.length) return;

  window.addEventListener('scroll', () => {
    let current = '';
    modules.forEach((m) => {
      if (window.scrollY >= m.offsetTop - 140) current = m.id;
    });
    navItems.forEach((n) => {
      n.classList.toggle('active', n.dataset.target === current);
    });
  });

  navItems.forEach((n) => {
    n.addEventListener('click', () => {
      const el = document.getElementById(n.dataset.target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    });
  });
}

/* ---------------- Progress rendering ---------------- */
function renderProgress() {
  const state = loadProgress();
  let doneCount = 0;

  for (let i = 1; i <= TOTAL_MODULES; i++) {
    const m = getModuleState(state, i);
    if (isModuleComplete(m)) doneCount++;

    const navCheck = document.querySelector(`.nav-item[data-target="module-${i}"] .check`);
    if (navCheck) {
      navCheck.classList.toggle('done', isModuleComplete(m));
      navCheck.textContent = isModuleComplete(m) ? '✓' : '';
    }
  }

  const pct = Math.round((doneCount / TOTAL_MODULES) * 100);
  const fill = document.getElementById('global-bar-fill');
  const label = document.getElementById('global-bar-label');
  if (fill) fill.style.width = pct + '%';
  if (label) label.innerHTML = `Progression <b>${pct}%</b> (${doneCount}/${TOTAL_MODULES} modules · 5 UV)`;

  saveProgress(state);
  return { state, doneCount, pct };
}

/* ---------------- TP checklist ---------------- */
function initTPChecks() {
  document.querySelectorAll('.tp-check').forEach((box) => {
    const moduleId = box.dataset.module;
    const input = box.querySelector('input[type="checkbox"]');
    if (!input || !moduleId) return;

    const state = loadProgress();
    const m = getModuleState(state, moduleId);
    input.checked = !!m.tp;
    box.classList.toggle('checked', !!m.tp);

    input.addEventListener('change', () => {
      const s = loadProgress();
      const mod = getModuleState(s, moduleId);
      mod.tp = input.checked;
      saveProgress(s);
      box.classList.toggle('checked', input.checked);
      renderProgress();
    });
  });
}

/* ---------------- Quiz engine ---------------- */
function initQuizzes() {
  document.querySelectorAll('.quiz[data-module]').forEach((quiz) => {
    const moduleId = quiz.dataset.module;
    const questions = Array.from(quiz.querySelectorAll('.quiz-question'));
    const resultBox = quiz.querySelector('.quiz-result');
    const scoreLabel = quiz.querySelector('.quiz-title .score');
    const retryBtn = quiz.querySelector('.quiz-retry');

    function evaluate() {
      const allDone = questions.every((q) => q.dataset.done === '1');
      const correctCount = questions.filter((q) => q.dataset.correct === '1').length;
      if (scoreLabel) scoreLabel.textContent = `${correctCount}/${questions.length}`;

      if (!allDone) return;

      const passed = correctCount / questions.length >= 0.7;
      const s = loadProgress();
      const mod = getModuleState(s, moduleId);
      mod.quizPassed = passed || mod.quizPassed;
      mod.quizScore = Math.max(mod.quizScore || 0, correctCount);
      saveProgress(s);

      if (resultBox) {
        resultBox.classList.add('show');
        const msg = resultBox.querySelector('.msg');
        if (msg) {
          msg.textContent = passed
            ? `Réussi ! ${correctCount}/${questions.length} bonnes réponses — module validé.`
            : `${correctCount}/${questions.length} bonnes réponses — réessayez pour valider le module (70% requis).`;
          msg.className = 'msg ' + (passed ? 'pass' : 'fail');
        }
      }
      renderProgress();
    }

    questions.forEach((q) => {
      const opts = q.querySelectorAll('.quiz-opt');
      const feedback = q.querySelector('.quiz-feedback');
      opts.forEach((opt) => {
        opt.addEventListener('click', () => {
          if (q.dataset.done === '1') return;
          q.dataset.done = '1';
          const isCorrect = opt.dataset.correct === 'true';
          q.dataset.correct = isCorrect ? '1' : '0';

          opts.forEach((o) => {
            o.classList.add('disabled');
            if (o.dataset.correct === 'true') o.classList.add('correct');
          });
          if (!isCorrect) opt.classList.add('wrong');

          if (feedback) {
            feedback.style.display = 'block';
            if (isCorrect) {
              feedback.style.background = 'rgba(34,197,94,.08)';
              feedback.style.color = '#4ade80';
              feedback.style.border = '1px solid rgba(34,197,94,.2)';
              feedback.textContent = '✓ Exact !';
            } else {
              feedback.style.background = 'rgba(239,68,68,.08)';
              feedback.style.color = '#f87171';
              feedback.style.border = '1px solid rgba(239,68,68,.2)';
              feedback.textContent = '✗ Pas tout à fait — la bonne réponse est en vert.';
            }
          }
          evaluate();
        });
      });
    });

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        questions.forEach((q) => {
          q.dataset.done = '';
          q.dataset.correct = '';
          q.querySelectorAll('.quiz-opt').forEach((o) => {
            o.classList.remove('disabled', 'correct', 'wrong');
          });
          const fb = q.querySelector('.quiz-feedback');
          if (fb) fb.style.display = 'none';
        });
        if (resultBox) resultBox.classList.remove('show');
        if (scoreLabel) scoreLabel.textContent = '';
      });
    }
  });
}

/* ---------------- Certificate generator ---------------- */
function initCertificate() {
  const btn = document.getElementById('gen-certificate');
  const cert = document.getElementById('certificate');
  const printBtn = document.getElementById('print-certificate');
  if (!btn || !cert) return;

  btn.addEventListener('click', () => {
    const { doneCount } = renderProgress();
    if (doneCount < TOTAL_MODULES) {
      const proceed = confirm(
        `Vous avez validé ${doneCount}/${TOTAL_MODULES} modules (TP + Quiz), soit une partie des 5 Unités de Valeur. ` +
        `Continuer pour générer un certificat de progression provisoire ?`
      );
      if (!proceed) return;
    }
    let userName = prompt('Entrez votre nom complet pour le certificat :', '');
    if (!userName || !userName.trim()) userName = 'Lauréat Formation IA';
    document.getElementById('cert-name').textContent = userName.trim();

    const today = new Date();
    document.getElementById('cert-date').textContent = today.toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const serial = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    document.getElementById('cert-serial').textContent = 'IA-CJEPE-' + serial;
    document.getElementById('cert-level').textContent =
      doneCount >= TOTAL_MODULES ? 'Expert en Intelligence Artificielle — 5 Unités de Valeur validées' : `Progression (${doneCount}/${TOTAL_MODULES} modules)`;

    cert.classList.add('show');
    cert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);

  initScrollSpy();
  initTPChecks();
  initQuizzes();
  initCertificate();
  renderProgress();
});
