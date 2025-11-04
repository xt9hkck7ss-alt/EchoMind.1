document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById('start-game');
  const nameInput = document.getElementById('player-name');
  const categorySelect = document.getElementById('category-select');
  const modeSelect = document.getElementById('mode-select');
  const catBtns = document.querySelectorAll('.cat-btn');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const questionArea = document.getElementById('questions');
  const nextBtn = document.getElementById('next-btn');
  const repeatBtn = document.getElementById('repeat-btn');
  const lifelineBtn = document.getElementById('lifeline-btn');
  const hintBtn = document.getElementById('hint-btn');
  const scoreDiv = document.getElementById('score');
  const funText = document.getElementById('fun-text');
  const leaderboardDiv = document.getElementById('leaderboard');
  const progressBar = document.getElementById('progress-bar');
  const timerDisplay = document.getElementById('timer');
  const bgMusic = document.getElementById('bg-music'); 
  const themeToggle = document.getElementById('theme-toggle');
  const character = document.getElementById('character');
  const quizContainer = document.getElementById('quiz-container');

  const correctSound = new Audio('/static/click.mp3'); 
  const incorrectSound = new Audio('/static/wrong.mp3'); 
  const submitSound = new Audio('/static/click.mp3'); 

  const QUESTION_LIMIT = 5;

  let playerName = "", category, difficulty, questions = [], current = 0, score = 0, usedLifeline = false;
  let timer, timeLeft = 15, reviewList = [];

  // Loading element
  const loadingElement = document.createElement('div');
  loadingElement.id = 'loading-message';
  loadingElement.textContent = "AI is generating questions...";
  loadingElement.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;color:#00ffd5; display:none; z-index:100;";
  quizContainer.prepend(loadingElement);

  // START GAME
  startBtn.addEventListener('click', () => {
    playerName = nameInput.value.trim() || 'Player';
    document.getElementById('player-name-section').style.display = 'none';
    categorySelect.style.display = 'block';
  });

  // SELECT CATEGORY
  catBtns.forEach(btn => btn.addEventListener('click', () => {
    category = btn.dataset.cat;
    categorySelect.style.display = 'none';
    modeSelect.style.display = 'block';
  }));

  // SELECT MODE / DIFFICULTY
  modeBtns.forEach(btn => btn.addEventListener('click', async () => {
    difficulty = btn.dataset.mode;
    modeSelect.style.display = 'none';

    // Hide quiz elements & show loading
    questionArea.innerHTML = '';
    scoreDiv.innerHTML = '';
    funText.innerHTML = '';
    leaderboardDiv.innerHTML = '';
    nextBtn.style.display = 'none';
    repeatBtn.style.display = 'none';
    lifelineBtn.style.display = 'none';
    hintBtn.style.display = 'none';
    timerDisplay.style.display = 'none';
    progressBar.style.display = 'none';

    loadingElement.style.display = 'block';

    if (bgMusic) {
      try { bgMusic.play(); } catch (e) { console.warn('Autoplay blocked', e); }
    }

    try {
      const response = await fetch(`/generate_questions?category=${category}&difficulty=${difficulty}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch questions');

      questions = data.slice(0, QUESTION_LIMIT);
      current = 0; score = 0; usedLifeline = false; reviewList = [];
      loadingElement.style.display = 'none';
      
      // Show quiz elements
      timerDisplay.style.display = 'block';
      progressBar.style.display = 'block';
      showQuestion();
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert(error.message || 'Network error while fetching questions.');
      loadingElement.style.display = 'none';
      categorySelect.style.display = 'block';
      if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    }
  }));

  function showQuestion() {
    if (current >= questions.length) return showScore();

    const q = questions[current];
    questionArea.innerHTML = `
      <div class="question-card active">
        <p>${q.question}</p>
        ${q.options.map(opt => `<label><input type="radio" name="answer" value="${opt}">${opt}</label>`).join('')}
      </div>
    `;

    nextBtn.style.display = 'none';
    lifelineBtn.style.display = 'block';
    hintBtn.style.display = 'block';
    progressBar.style.width = `${((current + 1) / questions.length) * 100}%`;
    lifelineBtn.disabled = usedLifeline;
    hintBtn.disabled = false;

    // Attach lifeline & hint
    lifelineBtn.onclick = useLifeline;
    hintBtn.onclick = getHint;

    document.querySelectorAll('label').forEach(label => {
      label.style.display = 'block'; // ensure labels are visible if previously hidden
      label.style.pointerEvents = 'auto';
      label.classList.remove('correct', 'incorrect');

      label.addEventListener('click', e => {
        clearInterval(timer);
        handleAnswer(e.currentTarget.querySelector('input').value);
      }, { once: true }); // ensure single click
    });

    startTimer();
  }

  function startTimer() {
    clearInterval(timer);
    timeLeft = 15;
    timerDisplay.textContent = `Time Left: ${timeLeft}s`;

    timer = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = `Time Left: ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(timer);
        handleAnswer(null);
      }
    }, 1000);
  }

  function handleAnswer(selected) {
    const q = questions[current];
    const labels = document.querySelectorAll('label');
    labels.forEach(l => l.style.pointerEvents = 'none');

    if (selected === q.answer) {
      labels.forEach(l => {
        if (l.querySelector('input').value === q.answer) l.classList.add('correct');
      });
      score++;
      reviewList.push({ q: q.question, correct: true, selectedAnswer: selected });
      character.style.transform = 'translateY(-20px)';
      setTimeout(() => character.style.transform = 'translateY(0px)', 300);
      incorrectSound.pause(); incorrectSound.currentTime = 0;
      correctSound.play();
    } else {
      if (selected !== null) {
        labels.forEach(l => {
          if (l.querySelector('input').value === selected) l.classList.add('incorrect');
        });
      }
      labels.forEach(l => { 
        if (l.querySelector('input').value === q.answer) l.classList.add('correct');
      });
      reviewList.push({ q: q.question, correct: false, selectedAnswer: selected, correctAnswer: q.answer });
      correctSound.pause(); correctSound.currentTime = 0;
      incorrectSound.play();
    }

    nextBtn.style.display = 'block';
  }

  nextBtn.addEventListener('click', () => {
    current++;
    if (current < questions.length) showQuestion();
    else showScore();
  });

  repeatBtn.addEventListener('click', () => location.reload());

  function showScore() {
    clearInterval(timer);
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }

    questionArea.innerHTML = '';
    nextBtn.style.display = 'none';
    lifelineBtn.style.display = 'none';
    hintBtn.style.display = 'none';
    repeatBtn.style.display = 'block';

    scoreDiv.textContent = `${playerName}'s Score: ${score}/${questions.length}`;

    if (leaderboardDiv) {
      let reviewHtml = "<h3>Review:</h3>";
      const incorrectAnswers = reviewList.filter(r => !r.correct);
      if (incorrectAnswers.length) {
        reviewHtml += "<p>Some questions were incorrect:</p>";
        reviewHtml += incorrectAnswers.map((r, i) =>
          `${i + 1}. Q: ${r.q}<br><b>Your Answer:</b> ${r.selectedAnswer}<br><b>Correct Answer:</b> ${r.correctAnswer}`
        ).join("<br><br>");
      } else {
        reviewHtml += "<p>Perfect! All correct!</p>";
      }
      leaderboardDiv.innerHTML = reviewHtml;
    }

    // Confetti
    const confettiContainer = document.getElementById('confetti');
    if (confettiContainer) {
      confettiContainer.innerHTML = '';
      for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        div.style.left = Math.random() * 100 + '%';
        div.style.backgroundColor = `hsl(${Math.random() * 360},70%,60%)`;
        div.style.animationDuration = (Math.random() * 2 + 1) + 's';
        confettiContainer.appendChild(div);
      }
    }
  }

  function useLifeline() {
    if (usedLifeline || !questions[current]) return;
    usedLifeline = true;
    const q = questions[current];
    const incorrectOptions = q.options.filter(opt => opt !== q.answer).sort(() => 0.5 - Math.random());
    const toHide = incorrectOptions.slice(0, Math.floor(incorrectOptions.length / 2));

    document.querySelectorAll('label').forEach(label => {
      const val = label.querySelector('input').value;
      if (toHide.includes(val)) label.style.display = 'none';
    });

    lifelineBtn.disabled = true;
  }

  async function getHint() {
    if (!questions[current]) return;
    hintBtn.disabled = true;
    const q = questions[current];

    try {
      const response = await fetch('/get_hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, options: q.options }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get hint');
      alert(`Hint: ${data.hint}`);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Error fetching hint.');
    } finally {
      hintBtn.disabled = false;
    }
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
  });
});
