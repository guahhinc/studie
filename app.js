// State
const defaultState = {
  apiKey: '',
  aiModel: 'gemini-3.1-flash-lite-preview',
  focusSubjects: ['Science', 'Systems Technology', 'English'],
  exams: [],
  streak: 0,
  lastActive: null,
  dailyCompleted: false,
  subjectProgress: {
    'Maths': 0, 'Science': 0, 'Systems Technology': 0,
    'English': 0, 'History': 0, 'Media Studies': 0
  },
  chatHistory: [],
  dailyQuiz: null
};

const savedState = JSON.parse(localStorage.getItem('studie_state'));
let state = savedState ? { ...defaultState, ...savedState } : { ...defaultState };
// Ensure arrays/objects are properly populated if missing
if (!state.focusSubjects) state.focusSubjects = [...defaultState.focusSubjects];
if (!state.subjectProgress) state.subjectProgress = { ...defaultState.subjectProgress };

// Hardcoded topics based on prompt
const subjectData = {
  'Maths': ['Finance', 'Algebra', 'Measurement', 'Graphing', 'Scatterplots'],
  'Science': ['DNA', 'Chromosomes and Genes', 'Mass, Acceleration and Gravity', 'Position, Distance and Displacement', 'Chemistry'],
  'Systems Technology': ['Wiring', 'Coding', 'Arduino', 'Circuit', 'Electricity'],
  'English': ['Essay Writing', 'Macbeth (Play)', 'Writing Techniques'],
  'History': ['WW2', 'Holocaust', 'Essay'],
  'Media Studies': ['Essay', 'Misery (Film)', 'Film Techniques', 'Camera Techniques', 'Lighting']
};

const studyTips = [
  "Take short breaks every 25 minutes to maintain focus.",
  "Teach a concept to an imaginary student to reinforce your understanding.",
  "Review your notes within 24 hours of learning to improve retention.",
  "Sleep is crucial for memory consolidation. Don't pull all-nighters!",
  "Test yourself rather than just re-reading notes.",
  "Mix up the subjects you study in a single session.",
  "Find a quiet, dedicated study space to minimize distractions.",
  "Stay hydrated! Your brain needs water to function optimally.",
  "Organise your study materials before you start studying.",
  "Break down large tasks into smaller, manageable chunks."
];

// Elements
const sidebarNavs = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');
const sidebar = document.getElementById('sidebar');

// Initialization
function init() {
  updateStreak();
  renderDashboard();
  renderCalendar();
  renderSettings();
  setupNavigation();
  setupEventListeners();
  loadChatHistory();
}

function saveState() {
  localStorage.setItem('studie_state', JSON.stringify(state));
  renderDashboard();
}

// Navigation
function setupNavigation() {
  sidebarNavs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if(btn.id === 'export-btn' || btn.id === 'import-btn') return;
      
      const pageId = btn.getAttribute('data-page');
      
      // Update Active Classes
      sidebarNavs.forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${pageId}`).classList.add('active');

      if (pageId === 'subject') {
        renderSubjectPage(btn.getAttribute('data-subject'));
      }
      if (pageId === 'settings') {
        renderSettings();
      }
    });
  });
}

function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastActive !== today) {
    if (state.lastActive) {
      const last = new Date(state.lastActive);
      const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        // If they didn't complete daily activity yesterday, they lose the streak
        if (!state.dailyCompleted) {
          state.streak = 0;
        }
      } else if (diff > 1) {
        state.streak = 0; // Lost streak
      }
    } else {
      state.streak = 0; // First day
    }
    state.lastActive = today;
    state.dailyCompleted = false; // Reset daily activity
    state.dailyQuiz = null; // Reset daily quiz
    saveState();
  }
  updateStreakDisplay();
}

function updateStreakDisplay() {
  document.getElementById('streak-count').textContent = state.streak;
  document.getElementById('streak-count-2').textContent = state.streak;
}

// Dashboard
function renderDashboard() {
  const safeFocus = Array.isArray(state.focusSubjects) ? state.focusSubjects : (state.focusSubjects ? [state.focusSubjects] : []);
  
  // Focus Subjects
  const focusText = document.getElementById('focus-text');
  const focusBadges = document.getElementById('focus-badges');
  
  if (safeFocus.length > 0) {
    focusText.innerHTML = `You've identified <strong>${safeFocus.join(', ')}</strong> as your priority subjects.`;
    focusBadges.innerHTML = safeFocus.map(sub => `<span class="chip chip-default">${sub}</span>`).join('');
  } else {
    focusText.innerHTML = "You haven't set your focus subjects yet. Head to Settings to update them!";
    focusBadges.innerHTML = '';
  }

  // Update nav priority badges
  document.querySelectorAll('.priority-badge').forEach(b => b.remove());
  safeFocus.forEach(sub => {
    const navId = `nav-${String(sub).toLowerCase().replace(/ /g, '-')}`;
    const navBtn = document.getElementById(navId);
    if(navBtn && !navBtn.querySelector('.priority-badge')) {
      navBtn.insertAdjacentHTML('beforeend', `<span class="priority-badge">Priority</span>`);
    }
  });

  // Daily Activity
  const pb = document.getElementById('daily-progress-bar');
  const pl = document.getElementById('daily-progress-label');
  if (state.dailyCompleted) {
    pb.style.width = '100%';
    pl.textContent = 'Completed today';
  } else if (state.dailyQuiz) {
    const pct = Math.round((state.dailyQuiz.currentQ / state.dailyQuiz.questions.length) * 100);
    pb.style.width = `${pct}%`;
    pl.textContent = `${state.dailyQuiz.currentQ} / ${state.dailyQuiz.questions.length} questions completed`;
  } else {
    pb.style.width = '0%';
    pl.textContent = '0 questions completed';
  }

  // Upcoming Exams
  const upcomingList = document.getElementById('upcoming-exams-list');
  const upcoming = [...state.exams].sort((a,b) => new Date(a.date) - new Date(b.date))
    .filter(e => new Date(e.date) >= new Date().setHours(0,0,0,0))
    .slice(0,3);

  if (upcoming.length > 0) {
    upcomingList.innerHTML = upcoming.map(exam => {
      const days = Math.ceil((new Date(exam.date) - new Date()) / (1000 * 60 * 60 * 24));
      let badge = 'days-ok';
      if(days <= 3) badge = 'days-urgent';
      else if(days <= 7) badge = 'days-soon';
      
      return `
        <div class="exam-item">
          <div class="exam-item-left">
            <span class="exam-item-name">${exam.name} (${exam.subject})</span>
            <span class="exam-item-date">${new Date(exam.date).toLocaleDateString()}</span>
          </div>
          <span class="exam-days-left ${badge}">${days === 0 ? 'Today' : days + ' days'}</span>
        </div>
      `;
    }).join('');
  } else {
    upcomingList.innerHTML = '<p class="empty-state">No upcoming exams.</p>';
  }

  // Subject Progress
  const progList = document.getElementById('subject-progress-list');
  progList.innerHTML = Object.entries(state.subjectProgress).map(([sub, val]) => `
    <div class="subject-prog-item">
      <div class="subject-prog-label">
        <span class="subject-prog-name">${sub}</span>
        <span class="subject-prog-pct">${val}%</span>
      </div>
      <div class="progress-container"><div class="progress-bar" style="width: ${val}%"></div></div>
    </div>
  `).join('');

  setRandomStudyTip();
}

function setRandomStudyTip() {
  const tip = studyTips[Math.floor(Math.random() * studyTips.length)];
  document.getElementById('study-tip-text').textContent = tip;
}

document.getElementById('refresh-tip-btn').addEventListener('click', setRandomStudyTip);

// Calendar (Simplified)
function renderCalendar() {
  // 1. Render Exam List
  const list = document.getElementById('exams-list');
  const sorted = [...state.exams].sort((a,b) => new Date(a.date) - new Date(b.date));
  
  if (sorted.length > 0) {
    list.innerHTML = sorted.map(exam => `
      <div class="exam-card">
        <span class="exam-card-name">${exam.name}</span>
        <div class="exam-card-meta">
          <span class="chip chip-default">${exam.subject}</span>
          <span class="exam-card-date">${new Date(exam.date).toLocaleDateString()}</span>
        </div>
        ${exam.notes ? `<p class="exam-card-notes">${exam.notes}</p>` : ''}
        <div class="exam-card-actions">
          <button class="exam-delete-btn" onclick="deleteExam('${exam.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } else {
    list.innerHTML = '<p class="empty-state">No exams added yet.</p>';
  }

  // 2. Render Calendar Grid
  const calDays = document.getElementById('cal-days');
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  document.getElementById('cal-month-label').textContent = now.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let gridHTML = '';
  // Empty slots
  for(let i=0; i<firstDay; i++) {
    gridHTML += `<div class="cal-day empty"></div>`;
  }
  
  // Day slots
  for(let i=1; i<=daysInMonth; i++) {
    const isToday = (i === now.getDate());
    const dateString = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const hasExam = state.exams.some(e => e.date === dateString);
    
    gridHTML += `<div class="cal-day ${isToday ? 'today' : ''} ${hasExam ? 'has-exam' : ''}">${i}</div>`;
  }
  calDays.innerHTML = gridHTML;
}

document.getElementById('add-exam-btn').addEventListener('click', () => {
  document.getElementById('exam-modal').classList.remove('hidden');
});

document.getElementById('exam-modal-close').addEventListener('click', () => {
  document.getElementById('exam-modal').classList.add('hidden');
});
document.getElementById('exam-modal-cancel').addEventListener('click', () => {
  document.getElementById('exam-modal').classList.add('hidden');
});

document.getElementById('exam-modal-save').addEventListener('click', () => {
  const name = document.getElementById('exam-name').value;
  const subject = document.getElementById('exam-subject').value;
  const date = document.getElementById('exam-date').value;
  const notes = document.getElementById('exam-notes').value;

  if (!name || !date) {
    showToast('Please fill in name and date', 'error');
    return;
  }

  state.exams.push({
    id: Date.now().toString(),
    name, subject, date, notes
  });
  saveState();
  renderCalendar();
  document.getElementById('exam-modal').classList.add('hidden');
  showToast('Exam added!', 'success');
});

window.deleteExam = (id) => {
  state.exams = state.exams.filter(e => e.id !== id);
  saveState();
  renderCalendar();
};

// Settings
function renderSettings() {
  document.getElementById('settings-api-key').value = state.apiKey;
  document.getElementById('settings-ai-model').value = state.aiModel;
  
  const safeFocus = Array.isArray(state.focusSubjects) ? state.focusSubjects : [];
  const focusCheckboxes = document.querySelectorAll('#settings-focus-list input[type="checkbox"]');
  focusCheckboxes.forEach(cb => {
    cb.checked = safeFocus.includes(cb.value);
  });
}

// Auto-save Focus Subjects
document.querySelectorAll('#settings-focus-list input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => {
    const focusCheckboxes = document.querySelectorAll('#settings-focus-list input[type="checkbox"]:checked');
    state.focusSubjects = Array.from(focusCheckboxes).map(c => c.value);
    saveState();
    showToast('Focus subjects updated!', 'success');
  });
});

document.getElementById('save-settings-btn').addEventListener('click', () => {
  state.apiKey = document.getElementById('settings-api-key').value;
  state.aiModel = document.getElementById('settings-ai-model').value;
  
  const focusCheckboxes = document.querySelectorAll('#settings-focus-list input[type="checkbox"]:checked');
  state.focusSubjects = Array.from(focusCheckboxes).map(cb => cb.value);
  
  saveState();
  showToast('Settings saved successfully', 'success');
});

// Utilities
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add('hidden'), 3000);
}

// Basic API Call Stub for AI features
async function callGemini(prompt) {
  if (!state.apiKey) {
    showToast("Please set an API key in settings", "error");
    return "Error: API Key missing.";
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${state.aiModel}:generateContent?key=${state.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    if(data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  } catch(e) {
    console.error(e);
    return `Error: ${e.message}`;
  }
}

// AI Chat implementation
document.getElementById('chat-send-btn').addEventListener('click', handleChatSubmit);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
  if(e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleChatSubmit();
  }
});

async function handleChatSubmit() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  const context = document.getElementById('chat-subject-select').value;
  
  if(!text) return;
  input.value = '';
  
  appendMessage('user', text);
  state.chatHistory.push({ role: 'user', text, context });
  saveState();
  
  appendTyping();
  
  const prompt = `Context: The user is studying ${context}. User question: ${text}. Provide a helpful, concise, and accurate response suitable for a student studying this topic.`;
  const reply = await callGemini(prompt);
  
  removeTyping();
  appendMessage('ai', reply);
  state.chatHistory.push({ role: 'ai', text: reply });
  saveState();
}

function parseMarkdown(text) {
  let html = text;
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg3);padding:10px;border-radius:6px;overflow-x:auto;"><code>$1</code></pre>');
  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3 style="margin-top:16px;margin-bottom:8px;font-size:16px;">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 style="margin-top:16px;margin-bottom:8px;font-size:18px;">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 style="margin-top:16px;margin-bottom:8px;font-size:20px;">$1</h1>');
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Lists
  html = html.replace(/^\- (.*?)$/gm, '<li style="margin-left:20px;">$1</li>');
  html = html.replace(/^\* (.*?)$/gm, '<li style="margin-left:20px;">$1</li>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  // Fix double breaks after lists and headers
  html = html.replace(/<\/li><br>/g, '</li>');
  html = html.replace(/<\/h([1-3])><br>/g, '</h$1>');
  return html;
}

function appendMessage(role, text) {
  const container = document.getElementById('chat-container');
  const welcome = document.querySelector('.chat-welcome');
  if(welcome) welcome.style.display = 'none';
  
  const div = document.createElement('div');
  div.className = `chat-message ${role === 'user' ? 'user-msg' : ''}`;
  
  const formattedText = parseMarkdown(text);
  
  div.innerHTML = `
    <div class="msg-avatar ${role}">${role === 'user' ? 'U' : 'AI'}</div>
    <div class="msg-bubble">${formattedText}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendTyping() {
  const container = document.getElementById('chat-container');
  const div = document.createElement('div');
  div.className = 'chat-message typing-msg';
  div.innerHTML = `
    <div class="msg-avatar ai">AI</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  const t = document.querySelector('.typing-msg');
  if(t) t.remove();
}

function loadChatHistory() {
  const container = document.getElementById('chat-container');
  if(state.chatHistory.length > 0) {
    const welcome = document.querySelector('.chat-welcome');
    if(welcome) welcome.style.display = 'none';
    state.chatHistory.forEach(msg => appendMessage(msg.role, msg.text));
  }
}

document.getElementById('clear-chat-btn').addEventListener('click', () => {
  state.chatHistory = [];
  saveState();
  const container = document.getElementById('chat-container');
  container.innerHTML = `
    <div class="chat-welcome">
      <div class="ai-avatar">🤖</div>
      <h3>Hi! I'm your Studie AI Tutor</h3>
      <p>Ask me anything...</p>
    </div>
  `;
});

// Subject Page Render
function renderSubjectPage(subjectName) {
  // capitalize first letter
  const prettyName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);
  const realName = Object.keys(subjectData).find(k => k.toLowerCase() === subjectName.toLowerCase()) || prettyName;
  
  // Extra topics for all subjects
  const extendedTopics = {
    'Maths': ['Finance', 'Algebra', 'Measurement', 'Graphing', 'Scatterplots', 'Geometry', 'Statistics', 'Probability', 'Calculus', 'Trigonometry'],
    'Science': ['DNA', 'Chromosomes and Genes', 'Mass, Acceleration and Gravity', 'Position, Distance and Displacement', 'Chemistry', 'Biology', 'Physics', 'Ecosystems', 'Chemical Reactions'],
    'Systems Technology': ['Wiring', 'Coding', 'Arduino', 'Circuit', 'Electricity', 'Robotics', 'Microcontrollers', 'Sensors', 'Logic Gates'],
    'English': ['Essay Writing', 'Macbeth (Play)', 'Writing Techniques', 'Poetry Analysis', 'Creative Writing', 'Grammar', 'Textual Analysis'],
    'History': ['WW2', 'Holocaust', 'Essay', 'Ancient Rome', 'Cold War', 'Industrial Revolution', 'Civil Rights Movement'],
    'Media Studies': ['Essay', 'Misery (Film)', 'Film Techniques', 'Camera Techniques', 'Lighting', 'Sound Design', 'Editing', 'Mise-en-scene', 'Media Ethics']
  };
  
  const topics = extendedTopics[realName] || subjectData[realName] || [];
  
  document.getElementById('subject-page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1>${realName}</h1>
        <p class="page-subtitle">Master these topics</p>
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 24px;">
      <h3>Custom Study Topic</h3>
      <p style="margin-bottom: 12px; font-size: 13px; color: var(--text2);">Don't see what you need below? Type any specific topic for ${realName} to generate a custom quiz or study notes.</p>
      <div class="chat-input-row" style="max-width: 600px;">
        <input type="text" id="custom-topic-input" placeholder="e.g. Advanced AI algorithms..." style="flex:1; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:10px; border-radius:var(--radius-sm);" />
        <button class="btn btn-primary" id="custom-topic-quiz-btn">Quiz</button>
        <button class="btn btn-ghost" id="custom-topic-notes-btn">Notes</button>
      </div>
    </div>
    
    <div class="topics-grid">
      ${topics.map(t => `
        <div class="topic-card">
          <h4>${t}</h4>
          <p>Explore this topic</p>
          <div class="topic-actions-row">
            <button class="btn btn-primary btn-sm" onclick="generateQuiz('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Quiz</button>
            <button class="btn btn-ghost btn-sm" onclick="generateStudyNotes('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Notes</button>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div id="subject-notes-area" style="margin-top: 24px;"></div>
  `;
  
  document.getElementById('custom-topic-quiz-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateQuiz(realName, val);
  });
  
  document.getElementById('custom-topic-notes-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateStudyNotes(realName, val);
  });
}

window.generateStudyNotes = async (subject, topic) => {
  const area = document.getElementById('subject-notes-area');
  area.scrollIntoView({ behavior: 'smooth' });
  area.innerHTML = `
    <div class="card">
      <div class="quiz-loading">
        <div class="spinner"></div>
        <p>Generating study notes on ${topic}...</p>
      </div>
    </div>
  `;
  
  const prompt = `Generate concise, easy-to-read study notes for a student about "${topic}" in the context of the subject "${subject}". Use clear headings, bullet points, and simple language. Make it visually clean (format with basic HTML like <h3>, <ul>, <li>, <p> - no markdown). Do not include any \`\`\`html tags.`;
  
  const result = await callGemini(prompt);
  let cleaned = result.replace(/```html/g, '').replace(/```/g, '');
  
  area.innerHTML = `
    <div class="card" style="margin-top: 24px;">
      <h3 style="margin-bottom: 16px; font-size: 18px;">Study Notes: ${topic}</h3>
      <div style="line-height: 1.6; font-size: 14px; color: var(--text);">${cleaned}</div>
    </div>
  `;
};

// Quiz Stub
window.generateQuiz = async (subject, topic) => {
  const modal = document.getElementById('quiz-modal');
  modal.classList.remove('hidden');
  document.getElementById('quiz-modal-title').textContent = `${topic} Quiz`;
  const body = document.getElementById('quiz-modal-body');
  
  body.innerHTML = `
    <div class="quiz-loading">
      <div class="spinner"></div>
      <p>Generating questions with AI...</p>
    </div>
  `;
  
  const prompt = `Create a 3 question multiple choice quiz about ${topic} in the context of ${subject}. Return ONLY a JSON array of objects, where each object has: "question" (string), "options" (array of 4 strings), "answer" (index of correct option 0-3), "explanation" (string explaining the answer). NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
  
  const result = await callGemini(prompt);
  try {
    let raw = result.trim();
    if(raw.startsWith('```json')) raw = raw.slice(7, -3);
    if(raw.startsWith('```')) raw = raw.slice(3, -3);
    const questions = JSON.parse(raw);
    renderQuiz(questions);
  } catch(e) {
    body.innerHTML = `<p>Error generating quiz. Please try again.</p>`;
    console.error(e, result);
  }
};

function renderQuiz(questions) {
  let currentQ = 0;
  let score = 0;
  const body = document.getElementById('quiz-modal-body');
  
  function showQuestion() {
    if(currentQ >= questions.length) {
      body.innerHTML = `
        <div class="quiz-score">
          <h3>Quiz Complete!</h3>
          <div class="score-num">${score} / ${questions.length}</div>
          <button class="btn btn-primary" onclick="document.getElementById('quiz-modal').classList.add('hidden')">Close</button>
        </div>
      `;
      return;
    }
    
    const q = questions[currentQ];
    body.innerHTML = `
      <div class="quiz-question">
        <h4>${currentQ + 1}. ${q.question}</h4>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `<button class="quiz-option" data-idx="${i}">${opt}</button>`).join('')}
        </div>
        <div id="quiz-feedback-area"></div>
      </div>
    `;
    
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if(btn.disabled) return;
        document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
        const selected = parseInt(e.target.getAttribute('data-idx'));
        if(selected === q.answer) {
          e.target.classList.add('correct');
          score++;
          document.getElementById('quiz-feedback-area').innerHTML = `
            <div class="quiz-feedback correct">Correct! ${q.explanation}</div>
            <button class="btn btn-primary" id="next-q-btn" style="margin-top: 10px">Next</button>
          `;
        } else {
          e.target.classList.add('wrong');
          document.querySelectorAll('.quiz-option')[q.answer].classList.add('correct');
          document.getElementById('quiz-feedback-area').innerHTML = `
            <div class="quiz-feedback wrong">Incorrect. ${q.explanation}</div>
            <button class="btn btn-primary" id="next-q-btn" style="margin-top: 10px">Next</button>
          `;
        }
        document.getElementById('next-q-btn').addEventListener('click', () => {
          currentQ++;
          showQuestion();
        });
      });
    });
  }
  showQuestion();
}

document.getElementById('quiz-modal-close').addEventListener('click', () => {
  document.getElementById('quiz-modal').classList.add('hidden');
});

// Import / Export
document.getElementById('export-btn').addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "studie_backup.json");
  dlAnchorElem.click();
});

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if(imported.apiKey !== undefined) {
        state = { ...defaultState, ...imported };
        saveState();
        init();
        showToast("Data imported successfully!", "success");
      }
    } catch(err) {
      showToast("Invalid backup file", "error");
    }
  };
  reader.readAsText(file);
});

// Start
function setupEventListeners() {
  const dashQuiz = document.getElementById('dash-quiz-card');
  if(dashQuiz) dashQuiz.addEventListener('click', () => {
    document.getElementById('nav-ai-chat').click();
  });
  
  const dashDaily = document.getElementById('dash-daily-card');
  if(dashDaily) dashDaily.addEventListener('click', () => {
    document.getElementById('nav-daily').click();
    setupDailyActivity();
  });
  
  // AI Chat Quick Prompts
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.getElementById('chat-input').value = btn.getAttribute('data-prompt');
      document.getElementById('chat-send-btn').click();
    });
  });
}

function setupDailyActivity() {
  if (state.dailyCompleted) {
    document.getElementById('daily-activity-title').textContent = "Daily Activity Complete! 🎉";
    document.getElementById('daily-activity-subject').style.display = 'none';
    document.getElementById('daily-timer-display').style.display = 'none';
    document.getElementById('daily-activity-content').innerHTML = "<p>Great job! You've finished your daily quiz for today. Come back tomorrow to keep your streak going.</p>";
    document.getElementById('start-daily-btn').classList.add('hidden');
    document.getElementById('daily-complete-btn')?.classList.add('hidden');
    document.getElementById('daily-next-btn')?.classList.add('hidden');
    return;
  }
  
  document.getElementById('daily-activity-subject').style.display = 'inline-block';
  document.getElementById('daily-activity-subject').textContent = 'Daily Quiz';
  document.getElementById('daily-timer-display').style.display = 'none';
  
  if (!state.dailyQuiz) {
    document.getElementById('daily-activity-title').textContent = "Daily Long Quiz";
    document.getElementById('daily-activity-content').innerHTML = `
      <p style="margin-bottom: 15px;">Complete your comprehensive daily quiz. This quiz contains multiple questions across all topics, with extra focus on your priority subjects. You can complete it throughout the day.</p>
    `;
    const startBtn = document.getElementById('start-daily-btn');
    startBtn.classList.remove('hidden');
    startBtn.textContent = "Generate & Start Quiz";
    
    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);
    
    newStartBtn.addEventListener('click', async () => {
      newStartBtn.disabled = true;
      newStartBtn.textContent = "Generating...";
      
      const safeFocus = Array.isArray(state.focusSubjects) ? state.focusSubjects.join(', ') : 'None';
      const prompt = `Create a 20 question multiple choice quiz covering a variety of topics from different subjects. Prioritize topics from the following subjects: ${safeFocus}. Include questions from Maths, Science, Systems Technology, English, History, Media Studies. Return ONLY a JSON array of objects, where each object has: "question" (string), "options" (array of 4 strings), "answer" (index of correct option 0-3), "explanation" (string explaining the answer). NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
      
      const result = await callGemini(prompt);
      try {
        let raw = result.trim();
        if(raw.startsWith('```json')) raw = raw.slice(7, -3);
        if(raw.startsWith('```')) raw = raw.slice(3, -3);
        const questions = JSON.parse(raw);
        state.dailyQuiz = { questions, currentQ: 0, score: 0 };
        saveState();
        renderDailyQuiz();
      } catch(e) {
        newStartBtn.disabled = false;
        newStartBtn.textContent = "Try Again";
        showToast("Error generating quiz", "error");
      }
    });
  } else {
    renderDailyQuiz();
  }
}

function renderDailyQuiz() {
  const startBtn = document.getElementById('start-daily-btn');
  startBtn.classList.add('hidden');
  
  const qData = state.dailyQuiz;
  if(qData.currentQ >= qData.questions.length) {
    if (!state.dailyCompleted) {
      state.streak += 1;
      state.dailyCompleted = true;
      saveState();
      updateStreakDisplay();
      showToast("Daily Activity Completed!", "success");
    }
    setupDailyActivity();
    renderDashboard();
    return;
  }
  
  document.getElementById('daily-activity-title').textContent = `Question ${qData.currentQ + 1} of ${qData.questions.length}`;
  const q = qData.questions[qData.currentQ];
  
  document.getElementById('daily-activity-content').innerHTML = `
    <div class="quiz-question" style="margin-top: 15px;">
      <h4>${q.question}</h4>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `<button class="quiz-option daily-opt" data-idx="${i}">${opt}</button>`).join('')}
      </div>
      <div id="daily-feedback-area"></div>
      <p style="font-size: 12px; color: var(--text2); text-align: center; margin-top: 20px;">Your progress is automatically saved. You can safely close the app and return later.</p>
    </div>
  `;
  
  document.querySelectorAll('.daily-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if(btn.disabled) return;
      document.querySelectorAll('.daily-opt').forEach(b => b.disabled = true);
      const selected = parseInt(e.target.getAttribute('data-idx'));
      if(selected === q.answer) {
        e.target.classList.add('correct');
        state.dailyQuiz.score++;
        document.getElementById('daily-feedback-area').innerHTML = `
          <div class="quiz-feedback correct">Correct! ${q.explanation}</div>
          <button class="btn btn-primary" id="daily-next-q-btn" style="margin-top: 10px">Next</button>
        `;
      } else {
        e.target.classList.add('wrong');
        document.querySelectorAll('.daily-opt')[q.answer].classList.add('correct');
        document.getElementById('daily-feedback-area').innerHTML = `
          <div class="quiz-feedback wrong">Incorrect. ${q.explanation}</div>
          <button class="btn btn-primary" id="daily-next-q-btn" style="margin-top: 10px">Next</button>
        `;
      }
      saveState();
      
      document.getElementById('daily-next-q-btn').addEventListener('click', () => {
        state.dailyQuiz.currentQ++;
        saveState();
        renderDashboard();
        renderDailyQuiz();
      });
    });
  });
}

init();
