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
  dailyQuiz: null,
  studyNotes: {},
  completedCourses: {},
  activeCourse: null
};

const savedState = JSON.parse(localStorage.getItem('studie_state'));
let state = savedState ? { ...defaultState, ...savedState } : { ...defaultState };
// Ensure arrays/objects are properly populated if missing
if (!state.focusSubjects) state.focusSubjects = [...defaultState.focusSubjects];
if (!state.subjectProgress) state.subjectProgress = { ...defaultState.subjectProgress };
if (!state.studyNotes) state.studyNotes = {};
if (!state.completedCourses) state.completedCourses = {};
if (state.activeCourse === undefined) state.activeCourse = null;

function renderMath(element) {
  if (!element) return;
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(element, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn("KaTeX error:", e);
    }
  } else {
    setTimeout(() => renderMath(element), 200);
  }
}

function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function checkSpelledAnswerClose(userInput, correctAnswer) {
  const u = userInput.trim().toLowerCase();
  const c = correctAnswer.trim().toLowerCase();
  if (u === c) return { isCorrect: true, isExact: true };
  
  const dist = getLevenshteinDistance(u, c);
  let maxAllowed = 0;
  if (c.length >= 4 && c.length <= 6) {
    maxAllowed = 1;
  } else if (c.length >= 7) {
    maxAllowed = 2;
  }
  
  if (dist <= maxAllowed) {
    return { isCorrect: true, isExact: false };
  }
  return { isCorrect: false, isExact: false };
}

// Hardcoded topics based on prompt
const subjectData = {
  'Maths': ['Finance', 'Algebra', 'Measurement', 'Graphing', 'Scatterplots'],
  'Science': ['DNA', 'Chromosomes and Genes', 'Mass, Acceleration and Gravity', 'Position, Distance and Displacement', 'Chemistry'],
  'Systems Technology': ['Wiring', 'Coding', 'Arduino', 'Circuit', 'Electricity'],
  'English': ['Essay Writing', 'Macbeth (Play)', 'Writing Techniques'],
  'History': ['WW2', 'Holocaust', 'Essay'],
  'Media Studies': ['Essay', 'Misery (Film)', 'Film Techniques', 'Camera Techniques', 'Lighting']
};

const extendedTopics = {
  'Maths': ['Finance', 'Algebra', 'Measurement', 'Graphing', 'Scatterplots', 'Geometry', 'Statistics', 'Probability', 'Calculus', 'Trigonometry'],
  'Science': ['DNA', 'Chromosomes and Genes', 'Mass, Acceleration and Gravity', 'Position, Distance and Displacement', 'Chemistry', 'Biology', 'Physics', 'Ecosystems', 'Chemical Reactions'],
  'Systems Technology': ['Wiring', 'Coding', 'Arduino', 'Circuit', 'Electricity', 'Robotics', 'Microcontrollers', 'Sensors', 'Logic Gates'],
  'English': ['Essay Writing', 'Macbeth (Play)', 'Writing Techniques', 'Poetry Analysis', 'Creative Writing', 'Grammar', 'Textual Analysis'],
  'History': ['WW2', 'Holocaust', 'Essay', 'Ancient Rome', 'Cold War', 'Industrial Revolution', 'Civil Rights Movement'],
  'Media Studies': ['Essay', 'Misery (Film)', 'Film Techniques', 'Camera Techniques', 'Lighting', 'Sound Design', 'Editing', 'Mise-en-scene', 'Media Ethics']
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
      if (pageId === 'daily') {
        setupDailyActivity();
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

  // Active Course Card
  const activeCard = document.getElementById('dash-active-course-card');
  if (activeCard) {
    if (state.activeCourse && state.activeCourse.items && state.activeCourse.items.length > 0) {
      activeCard.classList.remove('hidden');
      document.getElementById('dash-active-course-title').textContent = `${state.activeCourse.topic} Course`;
      document.getElementById('dash-active-course-desc').innerHTML = `Continue your course on <strong>${state.activeCourse.topic}</strong> (${state.activeCourse.subject})`;
      
      const currentStep = state.activeCourse.currentItem;
      const totalSteps = state.activeCourse.items.length;
      const pct = Math.round((currentStep / totalSteps) * 100);
      
      document.getElementById('dash-active-course-bar').style.width = `${pct}%`;
      document.getElementById('dash-active-course-step').textContent = `Step ${currentStep + 1} of ${totalSteps} (${pct}% completed)`;
    } else {
      activeCard.classList.add('hidden');
    }
  }

  setRandomStudyTip();
}

function setRandomStudyTip() {
  const tip = studyTips[Math.floor(Math.random() * studyTips.length)];
  document.getElementById('study-tip-text').textContent = tip;
}

document.getElementById('refresh-tip-btn').addEventListener('click', setRandomStudyTip);

// Calendar
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
let selectedDate = null;

document.getElementById('cal-prev').addEventListener('click', () => {
  currentCalMonth--;
  if(currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  currentCalMonth++;
  if(currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
  renderCalendar();
});

function renderCalendar() {
  // 1. Render Exam List
  const list = document.getElementById('exams-list');
  let examsToShow = [...state.exams].sort((a,b) => new Date(a.date) - new Date(b.date));
  
  if (selectedDate) {
    examsToShow = examsToShow.filter(e => e.date === selectedDate);
    const dObj = new Date(selectedDate);
    document.querySelector('.exams-panel h3').innerHTML = `Exams on ${dObj.toLocaleDateString()} <button class="btn btn-ghost btn-sm" id="clear-date-selection-btn" style="float: right; font-size: 10px; padding: 4px 8px;">View All</button>`;
    document.getElementById('clear-date-selection-btn').onclick = () => { selectedDate = null; renderCalendar(); };
  } else {
    document.querySelector('.exams-panel h3').innerHTML = 'All Exams';
  }
  
  if (examsToShow.length > 0) {
    list.innerHTML = examsToShow.map(exam => `
      <div class="exam-card">
        <span class="exam-card-name">${exam.name}</span>
        <div class="exam-card-meta">
          <span class="chip chip-default">${exam.subject}</span>
          <span class="exam-card-date">${new Date(exam.date).toLocaleDateString()}</span>
        </div>
        ${exam.notes ? `<p class="exam-card-notes">${exam.notes}</p>` : ''}
        <div class="exam-card-actions">
          <button class="exam-delete-btn" onclick="editExam('${exam.id}')">Edit</button>
          <button class="exam-delete-btn" onclick="deleteExam('${exam.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } else {
    list.innerHTML = selectedDate ? '<p class="empty-state">No exams on this date.</p>' : '<p class="empty-state">No exams added yet.</p>';
  }

  // 2. Render Calendar Grid
  const calDays = document.getElementById('cal-days');
  const now = new Date();
  const todayString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  
  const d = new Date(currentCalYear, currentCalMonth);
  document.getElementById('cal-month-label').textContent = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  
  let gridHTML = '';
  // Empty slots
  for(let i=0; i<firstDay; i++) {
    gridHTML += `<div class="cal-day empty"></div>`;
  }
  
  // Day slots
  for(let i=1; i<=daysInMonth; i++) {
    const dateString = `${currentCalYear}-${String(currentCalMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const hasExam = state.exams.some(e => e.date === dateString);
    const isToday = (dateString === todayString);
    const isSelected = (dateString === selectedDate);
    
    gridHTML += `<div class="cal-day ${isToday ? 'today' : ''} ${hasExam ? 'has-exam' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateString}">${i}</div>`;
  }
  calDays.innerHTML = gridHTML;
  
  document.querySelectorAll('.cal-day:not(.empty)').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const dateVal = dayEl.getAttribute('data-date');
      selectedDate = (selectedDate === dateVal) ? null : dateVal;
      renderCalendar();
    });
  });
}

let editingExamId = null;

document.getElementById('add-exam-btn').addEventListener('click', () => {
  editingExamId = null;
  document.getElementById('exam-modal-title').textContent = 'Add Exam';
  document.getElementById('exam-name').value = '';
  document.getElementById('exam-subject').value = 'Maths';
  document.getElementById('exam-date').value = '';
  document.getElementById('exam-notes').value = '';
  document.getElementById('exam-modal').classList.remove('hidden');
});

window.editExam = (id) => {
  const exam = state.exams.find(e => e.id === id);
  if(!exam) return;
  editingExamId = id;
  document.getElementById('exam-modal-title').textContent = 'Edit Exam';
  document.getElementById('exam-name').value = exam.name;
  document.getElementById('exam-subject').value = exam.subject;
  document.getElementById('exam-date').value = exam.date;
  document.getElementById('exam-notes').value = exam.notes || '';
  document.getElementById('exam-modal').classList.remove('hidden');
};

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

  if (editingExamId) {
    const idx = state.exams.findIndex(e => e.id === editingExamId);
    if(idx !== -1) {
      state.exams[idx] = { id: editingExamId, name, subject, date, notes };
    }
  } else {
    state.exams.push({
      id: Date.now().toString(),
      name, subject, date, notes
    });
  }
  
  saveState();
  renderCalendar();
  document.getElementById('exam-modal').classList.add('hidden');
  showToast(editingExamId ? 'Exam updated!' : 'Exam added!', 'success');
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

document.getElementById('settings-api-key').addEventListener('input', (e) => {
  state.apiKey = e.target.value;
  saveState();
});

document.getElementById('settings-ai-model').addEventListener('change', (e) => {
  state.aiModel = e.target.value;
  saveState();
});

document.getElementById('update-app-btn').addEventListener('click', () => {
  window.location.reload();
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
  
  const bubble = div.querySelector('.msg-bubble');
  renderMath(bubble);
  
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
  
  const topics = extendedTopics[realName] || subjectData[realName] || [];
  const notesList = state.studyNotes[realName] || [];

  let activeCourseBanner = '';
  if (state.activeCourse && state.activeCourse.subject.toLowerCase() === realName.toLowerCase()) {
    const currentStep = state.activeCourse.currentItem;
    const totalSteps = state.activeCourse.items.length;
    const pct = Math.round((currentStep / totalSteps) * 100);
    activeCourseBanner = `
      <div class="card clickable" id="subject-active-course-banner" style="border: 2px solid #8b7cf8; background: rgba(139,124,248,0.05); margin-bottom: 24px; cursor: pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin:0; font-size:16px;">Active Course: ${state.activeCourse.topic}</h3>
            <p style="margin:5px 0 0 0; font-size:13px; color:var(--text2);">You are currently taking this progressive study course. Click to resume!</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="resumeActiveCourse()">Resume Course →</button>
        </div>
        <div class="progress-container" style="margin-top: 15px;">
          <div class="progress-bar" style="width: ${pct}%; background: #8b7cf8;"></div>
        </div>
        <span class="progress-label" style="font-weight: 600;">Step ${currentStep + 1} of ${totalSteps} (${pct}% completed)</span>
      </div>
    `;
  }
  
  document.getElementById('subject-page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1>${realName}</h1>
        <p class="page-subtitle">Master these topics</p>
      </div>
    </div>

    ${activeCourseBanner}
    
    <div id="saved-notes-section" style="margin-bottom: 24px;">
      <h3>Your Study Notes</h3>
      ${notesList.length > 0 ? `
        <div class="topics-grid" style="margin-top: 10px;">
          ${notesList.map(n => `
            <div class="topic-card" style="padding: 12px 16px;">
              <h4 style="margin-bottom: 4px;">${n.topic}</h4>
              <p style="font-size: 11px;">${new Date(n.id).toLocaleDateString()}</p>
              <div class="topic-actions-row" style="margin-top: 8px;">
                <button class="btn btn-primary btn-sm" onclick="viewSavedNote('${realName.replace(/'/g, "\\'")}', ${n.id})">View/Edit</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteSavedNote('${realName.replace(/'/g, "\\'")}', ${n.id})">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty-state" style="text-align: left; padding: 10px 0;">No saved notes yet. Generate some below!</p>'}
    </div>
    
    <div class="card" style="margin-bottom: 24px;">
      <h3>Custom Study Topic</h3>
      <p style="margin-bottom: 12px; font-size: 13px; color: var(--text2);">Don't see what you need below? Type any specific topic for ${realName} to generate custom study tools.</p>
      <div class="chat-input-row" style="max-width: 600px; display: flex; flex-wrap: wrap; gap: 8px;">
        <input type="text" id="custom-topic-input" placeholder="e.g. Advanced AI algorithms..." style="flex:1 1 100%; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:10px; border-radius:var(--radius-sm);" />
        <button class="btn btn-primary btn-sm" id="custom-topic-quiz-btn">Quiz</button>
        <button class="btn btn-ghost btn-sm" id="custom-topic-typed-btn">Short Answer</button>
        <button class="btn btn-ghost btn-sm" id="custom-topic-matching-btn">Matching</button>
        <button class="btn btn-ghost btn-sm" id="custom-topic-notes-btn">Notes</button>
        <button class="btn btn-primary btn-sm" style="background-color: #8b7cf8; color: white;" id="custom-topic-course-btn">Course</button>
      </div>
    </div>
    
    <div class="topics-grid">
      ${topics.map(t => `
        <div class="topic-card">
          <h4>${t}</h4>
          <p>Explore this topic</p>
          <div class="topic-actions-row" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px;">
            <button class="btn btn-primary btn-sm" style="flex: 1 1 45%;" onclick="generateQuiz('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Quiz</button>
            <button class="btn btn-ghost btn-sm" style="flex: 1 1 45%;" onclick="generateShortAnswer('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Typed</button>
            <button class="btn btn-ghost btn-sm" style="flex: 1 1 45%;" onclick="generateMatchingStandalone('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Match</button>
            <button class="btn btn-ghost btn-sm" style="flex: 1 1 45%;" onclick="generateStudyNotes('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Notes</button>
            <button class="btn btn-primary btn-sm" style="flex: 1 1 100%; background-color: #8b7cf8; color: white;" onclick="generateCourse('${realName.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')">Full Course</button>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div id="subject-notes-area" style="margin-top: 24px;"></div>
  `;
  
  if (document.getElementById('subject-active-course-banner')) {
    document.getElementById('subject-active-course-banner').addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        resumeActiveCourse();
      }
    });
  }

  document.getElementById('custom-topic-quiz-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateQuiz(realName, val);
  });
  
  document.getElementById('custom-topic-notes-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateStudyNotes(realName, val);
  });

  document.getElementById('custom-topic-course-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateCourse(realName, val);
  });

  document.getElementById('custom-topic-typed-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateShortAnswer(realName, val);
  });

  document.getElementById('custom-topic-matching-btn').addEventListener('click', () => {
    const val = document.getElementById('custom-topic-input').value.trim();
    if(val) generateMatchingStandalone(realName, val);
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
  
  if (!state.studyNotes[subject]) state.studyNotes[subject] = [];
  const newNoteId = Date.now();
  state.studyNotes[subject].push({
    id: newNoteId,
    topic: topic,
    content: cleaned
  });
  saveState();
  
  renderSubjectPage(subject);
  viewSavedNote(subject, newNoteId);
};

window.viewSavedNote = (subject, noteId) => {
  const note = state.studyNotes[subject].find(n => n.id === noteId);
  if(!note) return;
  const area = document.getElementById('subject-notes-area');
  area.scrollIntoView({ behavior: 'smooth' });
  
  area.innerHTML = `
    <div class="card" style="margin-top: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 18px;">Study Notes: ${note.topic}</h3>
        <div>
          <button class="btn btn-ghost btn-sm" onclick="editSavedNote('${subject.replace(/'/g, "\\'")}', ${noteId})">Edit Notes</button>
        </div>
      </div>
      <div style="line-height: 1.6; font-size: 14px; color: var(--text);">${note.content}</div>
    </div>
  `;
  renderMath(area);
};

window.editSavedNote = (subject, noteId) => {
  const note = state.studyNotes[subject].find(n => n.id === noteId);
  if(!note) return;
  const area = document.getElementById('subject-notes-area');
  
  area.innerHTML = `
    <div class="card" style="margin-top: 24px;">
      <h3 style="margin-bottom: 16px; font-size: 18px;">Edit Study Notes: ${note.topic}</h3>
      <textarea id="edit-note-content" style="width: 100%; min-height: 300px; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 10px; border-radius: var(--radius-sm); font-family: inherit; font-size: 14px; resize: vertical; margin-bottom: 16px;">${note.content}</textarea>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-primary" onclick="saveEditedNote('${subject.replace(/'/g, "\\'")}', ${noteId})">Save</button>
        <button class="btn btn-ghost" onclick="viewSavedNote('${subject.replace(/'/g, "\\'")}', ${noteId})">Cancel</button>
      </div>
    </div>
  `;
};

window.saveEditedNote = (subject, noteId) => {
  const content = document.getElementById('edit-note-content').value;
  const note = state.studyNotes[subject].find(n => n.id === noteId);
  if(note) {
    note.content = content;
    saveState();
    viewSavedNote(subject, noteId);
    showToast('Notes saved successfully', 'success');
  }
};

window.deleteSavedNote = (subject, noteId) => {
  state.studyNotes[subject] = state.studyNotes[subject].filter(n => n.id !== noteId);
  saveState();
  document.getElementById('subject-notes-area').innerHTML = '';
  renderSubjectPage(subject);
  showToast('Note deleted', 'success');
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
  
  const prompt = `Create a 6 question multiple choice quiz about ${topic} in the context of ${subject}. Ensure the questions are highly unique, diverse, and randomized each time so the user does not get the same questions repeatedly. Make the questions challenging. Return ONLY a JSON array of objects, where each object has: "question" (string), "options" (array of 4 strings), "answer" (index of correct option 0-3), "explanation" (string explaining the answer). NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
  
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
    renderMath(body);
    
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
        renderMath(document.getElementById('quiz-feedback-area'));
        
        document.getElementById('next-q-btn').addEventListener('click', () => {
          currentQ++;
          showQuestion();
        });
      });
    });
  }
  showQuestion();
}

window.generateShortAnswer = async (subject, topic) => {
  const modal = document.getElementById('quiz-modal');
  modal.classList.remove('hidden');
  document.getElementById('quiz-modal-title').textContent = `${topic} - Short Answer`;
  const body = document.getElementById('quiz-modal-body');
  
  body.innerHTML = `
    <div class="quiz-loading">
      <div class="spinner"></div>
      <p>Generating typed questions with AI... Please wait.</p>
    </div>
  `;
  
  const prompt = `Generate exactly 6 short answer questions about ${topic} in the context of ${subject}. Return ONLY a JSON array of 6 objects. Each object must have fields: 'question' (string), 'answer' (exact expected single word or very short phrase), and 'explanation' (string explaining why it is correct). Ensure all generated content is highly unique and accurately reflects ${subject}. NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
  
  const result = await callGemini(prompt);
  try {
    let raw = result.trim();
    if(raw.startsWith('```json')) raw = raw.slice(7, -3);
    if(raw.startsWith('```')) raw = raw.slice(3, -3);
    const questions = JSON.parse(raw);
    renderShortAnswerQuiz(questions);
  } catch(e) {
    body.innerHTML = `<p>Error generating questions. Please try again.</p>`;
    console.error(e, result);
  }
};

function renderShortAnswerQuiz(questions) {
  let currentQ = 0;
  let score = 0;
  const body = document.getElementById('quiz-modal-body');
  
  function showQuestion() {
    if(currentQ >= questions.length) {
      body.innerHTML = `
        <div class="quiz-score">
          <h3>Short Answer Complete!</h3>
          <div class="score-num">${score} / ${questions.length}</div>
          <button class="btn btn-primary" onclick="document.getElementById('quiz-modal').classList.add('hidden')">Close</button>
        </div>
      `;
      return;
    }
    
    const q = questions[currentQ];
    body.innerHTML = `
      <div class="quiz-question">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span class="chip chip-blue" style="background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 4px 8px; border-radius: 4px; font-size: 11px;">Short Answer</span>
          <span style="font-size: 13px; color: var(--text2);">Question ${currentQ + 1} of ${questions.length}</span>
        </div>
        <h4>${q.question}</h4>
        <div style="margin-top: 15px; margin-bottom: 15px;">
          <input type="text" id="short-q-input" placeholder="Type your answer here..." style="width:100%; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:12px; border-radius:var(--radius-sm); font-size:14px;" autocomplete="off" />
        </div>
        <div id="short-q-feedback"></div>
        <button class="btn btn-primary" id="short-q-submit" style="width: 100%;">Submit Answer</button>
      </div>
    `;
    renderMath(body);
    
    const inputEl = document.getElementById('short-q-input');
    const submitBtn = document.getElementById('short-q-submit');
    
    inputEl.focus();
    inputEl.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') submitBtn.click();
    });
    
    submitBtn.addEventListener('click', () => {
      const val = inputEl.value.trim();
      if(!val) return;
      
      inputEl.disabled = true;
      submitBtn.classList.add('hidden');
      
      const checkResult = checkSpelledAnswerClose(val, q.answer);
      if(checkResult.isCorrect) score++;
      
      if(checkResult.isCorrect) {
        const spellingNotice = checkResult.isExact ? '' : ` (Spelling corrected to: <strong>${q.answer}</strong>)`;
        document.getElementById('short-q-feedback').innerHTML = `
          <div class="quiz-feedback correct" style="margin-bottom: 15px;">Correct!${spellingNotice} ${q.explanation}</div>
          <button class="btn btn-primary" id="short-q-next" style="width: 100%;">Next</button>
        `;
      } else {
        document.getElementById('short-q-feedback').innerHTML = `
          <div class="quiz-feedback wrong" style="margin-bottom: 15px;">Incorrect. The correct answer was: <strong>${q.answer}</strong>.<br><br>${q.explanation}</div>
          <button class="btn btn-primary" id="short-q-next" style="width: 100%;">Next</button>
        `;
      }
      renderMath(document.getElementById('short-q-feedback'));
      
      document.getElementById('short-q-next').addEventListener('click', () => {
        currentQ++;
        showQuestion();
      });
    });
  }
  
  showQuestion();
}

window.generateMatchingStandalone = async (subject, topic) => {
  const modal = document.getElementById('quiz-modal');
  modal.classList.remove('hidden');
  document.getElementById('quiz-modal-title').textContent = `${topic} - Matching`;
  const body = document.getElementById('quiz-modal-body');
  
  body.innerHTML = `
    <div class="quiz-loading">
      <div class="spinner"></div>
      <p>Generating matching pairs with AI... Please wait.</p>
    </div>
  `;
  
  const prompt = `Generate exactly 6 matching pairs about ${topic} in the context of ${subject}. Return ONLY a JSON array of 6 objects, where each object has 'left' and 'right' properties. Provide the CORRECT pairs, the app will shuffle them. Ensure all generated content is highly unique and accurately reflects ${subject}. NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
  
  const result = await callGemini(prompt);
  try {
    let raw = result.trim();
    if(raw.startsWith('```json')) raw = raw.slice(7, -3);
    if(raw.startsWith('```')) raw = raw.slice(3, -3);
    const pairs = JSON.parse(raw);
    renderMatchingStandalone(pairs);
  } catch(e) {
    body.innerHTML = `<p>Error generating matching pairs. Please try again.</p>`;
    console.error(e, result);
  }
};

function renderMatchingStandalone(pairs) {
  const body = document.getElementById('quiz-modal-body');
  const lefts = pairs.map((p, i) => ({ text: p.left, id: i }));
  const rights = pairs.map((p, i) => ({ text: p.right, id: i })).sort(() => Math.random() - 0.5);
  
  body.innerHTML = `
    <div class="quiz-question">
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <span class="chip chip-blue" style="background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 4px 8px; border-radius: 4px; font-size: 11px;">Matching</span>
        <span style="font-size: 13px; color: var(--text2);">6 pairs to match</span>
      </div>
      <h4>Match the pairs correctly</h4>
      <div class="match-grid-container">
        <div class="match-col" id="match-left-col">
          ${lefts.map(l => `<button class="match-card match-btn-l" data-id="${l.id}">${l.text}</button>`).join('')}
        </div>
        <div class="match-col" id="match-right-col">
          ${rights.map(r => `<button class="match-card match-btn-r" data-id="${r.id}">${r.text}</button>`).join('')}
        </div>
      </div>
      <div id="matching-feedback"></div>
      <button class="btn btn-primary hidden" id="matching-close-btn" style="margin-top: 20px; width: 100%;">Close</button>
    </div>
  `;
  
  let selectedLeft = null;
  let selectedRight = null;
  let matchedCount = 0;
  let lockout = false;
  
  const leftBtns = document.querySelectorAll('.match-btn-l');
  const rightBtns = document.querySelectorAll('.match-btn-r');
  
  function checkMatch() {
    if (!selectedLeft || !selectedRight) return;
    lockout = true;
    
    const leftId = selectedLeft.getAttribute('data-id');
    const rightId = selectedRight.getAttribute('data-id');
    
    if (leftId === rightId) {
      selectedLeft.classList.remove('selected');
      selectedRight.classList.remove('selected');
      selectedLeft.classList.add('matched');
      selectedRight.classList.add('matched');
      selectedLeft.disabled = true;
      selectedRight.disabled = true;
      
      selectedLeft = null;
      selectedRight = null;
      matchedCount++;
      lockout = false;
      
      if (matchedCount === pairs.length) {
        document.getElementById('matching-feedback').innerHTML = '<p style="color: var(--success); margin-top: 15px; font-weight: bold; text-align: center;">🎉 All matched correctly!</p>';
        document.getElementById('matching-close-btn').classList.remove('hidden');
      }
    } else {
      const cardL = selectedLeft;
      const cardR = selectedRight;
      
      cardL.classList.remove('selected');
      cardR.classList.remove('selected');
      cardL.classList.add('mismatched');
      cardR.classList.add('mismatched');
      
      setTimeout(() => {
        cardL.classList.remove('mismatched');
        cardR.classList.remove('mismatched');
        selectedLeft = null;
        selectedRight = null;
        lockout = false;
      }, 600);
    }
  }
  
  leftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || lockout) return;
      leftBtns.forEach(b => b.classList.remove('selected'));
      if (selectedLeft === btn) {
        selectedLeft = null;
      } else {
        btn.classList.add('selected');
        selectedLeft = btn;
        checkMatch();
      }
    });
  });
  
  rightBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || lockout) return;
      rightBtns.forEach(b => b.classList.remove('selected'));
      if (selectedRight === btn) {
        selectedRight = null;
      } else {
        btn.classList.add('selected');
        selectedRight = btn;
        checkMatch();
      }
    });
  });
  
  document.getElementById('matching-close-btn').addEventListener('click', () => {
    document.getElementById('quiz-modal').classList.add('hidden');
  });
}

document.getElementById('quiz-modal-close').addEventListener('click', () => {
  document.getElementById('quiz-modal').classList.add('hidden');
});

window.generateCourse = async (subject, topic) => {
  const modal = document.getElementById('course-modal');
  modal.classList.remove('hidden');
  document.getElementById('course-modal-title').textContent = `${topic} Course`;
  const body = document.getElementById('course-modal-body');
  
  body.innerHTML = `
    <div class="quiz-loading">
      <div class="spinner"></div>
      <p>Generating a full course with AI... This might take a moment.</p>
    </div>
  `;
  
  const prompt = `Create a 30-item progressively harder course about ${topic} in the context of ${subject}. The course should include a variety of item types in this order to build knowledge: 'notes' (short revision text), 'flashcard' (concept and definition), 'matching' (match pairs), 'quiz' (multiple choice), 'shortanswer' (a typed response question), and 'workout' (a question requiring step-by-step working out). Return ONLY a JSON array of 30 objects. Each object must have a 'type' field ('quiz', 'flashcard', 'notes', 'matching', 'shortanswer', or 'workout'). 
For 'quiz': include 'question', 'options' (array of 4 strings), 'answer' (index 0-3), 'explanation'.
For 'flashcard': include 'front' (a clear question asking about a term or concept, e.g. "What is a gene?"), 'back' (the detailed definition or explanation).
For 'notes': include 'content' (HTML formatted revision notes, simple tags like <p>, <ul>, <li>, <strong>).
For 'matching': include 'pairs' (array of 3-4 objects with 'left' and 'right' properties. Provide the CORRECT pairs, the app will shuffle them).
For 'shortanswer': include 'question' (typed question), 'answer' (exact expected single word or simple phrase answer), 'explanation'.
For 'workout': include 'question' and 'solution' (step-by-step text).
Ensure all generated content is highly unique, challenging, and accurately reflects ${subject}. NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
  
  const result = await callGemini(prompt);
  try {
    let raw = result.trim();
    if(raw.startsWith('```json')) raw = raw.slice(7, -3);
    if(raw.startsWith('```')) raw = raw.slice(3, -3);
    const courseItems = JSON.parse(raw);
    
    // Save to activeCourse state
    state.activeCourse = {
      subject,
      topic,
      items: courseItems,
      currentItem: 0
    };
    saveState();
    
    renderCourse(courseItems, subject, topic, 0);
  } catch(e) {
    body.innerHTML = `<p>Error generating course. Please try again.</p>`;
    console.error(e, result);
  }
};

window.resumeActiveCourse = () => {
  if (state.activeCourse && state.activeCourse.items && state.activeCourse.items.length > 0) {
    const modal = document.getElementById('course-modal');
    modal.classList.remove('hidden');
    document.getElementById('course-modal-title').textContent = `${state.activeCourse.topic} Course`;
    renderCourse(state.activeCourse.items, state.activeCourse.subject, state.activeCourse.topic, state.activeCourse.currentItem);
  }
};

function renderCourse(items, subject, topic, resumeIndex = 0) {
  let currentItem = resumeIndex;
  const body = document.getElementById('course-modal-body');
  
  function showItem() {
    if(currentItem >= items.length) {
      // Mark course as completed for this subject/topic
      if (!state.completedCourses) state.completedCourses = {};
      if (!state.completedCourses[subject]) state.completedCourses[subject] = [];
      if (!state.completedCourses[subject].includes(topic)) {
        state.completedCourses[subject].push(topic);
        
        // Update progress
        const topicsList = extendedTopics[subject] || subjectData[subject] || [];
        const total = topicsList.length || 1;
        const completed = state.completedCourses[subject].length;
        state.subjectProgress[subject] = Math.min(100, Math.round((completed / total) * 100));
      }
      
      // Reset active course when complete
      if (state.activeCourse && state.activeCourse.subject === subject && state.activeCourse.topic === topic) {
        state.activeCourse = null;
      }
      saveState();

      body.innerHTML = `
        <div class="quiz-score">
          <h3>Course Complete!</h3>
          <p>You've successfully finished this course.</p>
          <button class="btn btn-primary" onclick="document.getElementById('course-modal').classList.add('hidden')">Close</button>
        </div>
      `;
      return;
    }
    
    // Save/update intermediate progress
    if (state.activeCourse && state.activeCourse.subject === subject && state.activeCourse.topic === topic) {
      state.activeCourse.currentItem = currentItem;
      saveState();
    }
    
    const item = items[currentItem];
    const headerHtml = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <span class="chip chip-blue" style="text-transform: capitalize;">${item.type}</span>
        <span style="font-size: 13px; color: var(--text2);">Step ${currentItem + 1} of ${items.length}</span>
      </div>
    `;
    
    if (item.type === 'notes') {
      body.innerHTML = `
        <div class="quiz-question">
          ${headerHtml}
          <div style="line-height: 1.6; font-size: 14px; background: var(--bg3); padding: 15px; border-radius: var(--radius-md);">
            ${item.content}
          </div>
          <button class="btn btn-primary" id="course-next-btn" style="margin-top: 20px; width: 100%;">Continue</button>
        </div>
      `;
      document.getElementById('course-next-btn').addEventListener('click', () => { currentItem++; showItem(); });
    } 
    else if (item.type === 'flashcard') {
      body.innerHTML = `
        <div class="quiz-question">
          ${headerHtml}
          <div id="flashcard-container" style="perspective: 1000px; cursor: pointer; height: 200px; margin-bottom: 20px;">
            <div id="flashcard-inner" style="width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; position: relative;">
              <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: var(--bg3); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: 2px solid var(--border); padding: 20px; text-align: center;">
                <h3 style="margin:0;">${item.front}</h3>
                <span style="position:absolute; bottom: 10px; font-size: 11px; color: var(--text2);">Click to flip</span>
              </div>
              <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: var(--secondary); color: white; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); padding: 20px; text-align: center; transform: rotateY(180deg);">
                <p style="margin:0;">${item.back}</p>
              </div>
            </div>
          </div>
          <button class="btn btn-primary" id="course-next-btn" style="width: 100%;">Got it!</button>
        </div>
      `;
      let flipped = false;
      document.getElementById('flashcard-container').addEventListener('click', () => {
        flipped = !flipped;
        document.getElementById('flashcard-inner').style.transform = flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
      });
      document.getElementById('course-next-btn').addEventListener('click', () => { currentItem++; showItem(); });
    }
    else if (item.type === 'quiz') {
      body.innerHTML = `
        <div class="quiz-question">
          ${headerHtml}
          <h4>${item.question}</h4>
          <div class="quiz-options">
            ${item.options.map((opt, i) => `<button class="quiz-option course-opt" data-idx="${i}">${opt}</button>`).join('')}
          </div>
          <div id="course-feedback-area"></div>
        </div>
      `;
      
      document.querySelectorAll('.course-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if(btn.disabled) return;
          document.querySelectorAll('.course-opt').forEach(b => b.disabled = true);
          const selected = parseInt(e.target.getAttribute('data-idx'));
          if(selected === item.answer) {
            e.target.classList.add('correct');
            document.getElementById('course-feedback-area').innerHTML = `
              <div class="quiz-feedback correct">Correct! ${item.explanation}</div>
              <button class="btn btn-primary" id="course-next-btn" style="margin-top: 10px">Next</button>
            `;
          } else {
            e.target.classList.add('wrong');
            document.querySelectorAll('.course-opt')[item.answer].classList.add('correct');
            document.getElementById('course-feedback-area').innerHTML = `
              <div class="quiz-feedback wrong">Incorrect. ${item.explanation}</div>
              <button class="btn btn-primary" id="course-next-btn" style="margin-top: 10px">Next</button>
            `;
          }
          document.getElementById('course-next-btn').addEventListener('click', () => {
            currentItem++;
            showItem();
          });
        });
      });
    }
    else if (item.type === 'workout') {
      body.innerHTML = `
        <div class="quiz-question">
          ${headerHtml}
          <h4>${item.question}</h4>
          <p style="font-size: 13px; color: var(--text2); margin-bottom: 10px;">Work out the answer on paper, then check the solution.</p>
          <button class="btn btn-ghost" id="show-solution-btn" style="width: 100%; margin-bottom: 15px;">Show Solution</button>
          <div id="solution-area" class="hidden" style="background: var(--bg3); padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px;">
            ${item.solution.replace(/\n/g, '<br>')}
          </div>
          <button class="btn btn-primary hidden" id="course-next-btn" style="width: 100%;">Next</button>
        </div>
      `;
      document.getElementById('show-solution-btn').addEventListener('click', (e) => {
        e.target.classList.add('hidden');
        document.getElementById('solution-area').classList.remove('hidden');
        document.getElementById('course-next-btn').classList.remove('hidden');
      });
      document.getElementById('course-next-btn').addEventListener('click', () => { currentItem++; showItem(); });
    }
    else if (item.type === 'matching') {
      const lefts = item.pairs.map((p, i) => ({ text: p.left, id: i }));
      const rights = item.pairs.map((p, i) => ({ text: p.right, id: i })).sort(() => Math.random() - 0.5);
      
      body.innerHTML = `
        <div class="quiz-question">
          ${headerHtml}
          <h4>Match the pairs correctly</h4>
          <div class="match-grid-container">
            <div class="match-col" id="match-left-col">
              ${lefts.map(l => `<button class="match-card match-btn-l" data-id="${l.id}">${l.text}</button>`).join('')}
            </div>
            <div class="match-col" id="match-right-col">
              ${rights.map(r => `<button class="match-card match-btn-r" data-id="${r.id}">${r.text}</button>`).join('')}
            </div>
          </div>
          <div id="matching-feedback"></div>
          <button class="btn btn-primary hidden" id="course-next-btn" style="margin-top: 20px; width: 100%;">Next</button>
        </div>
      `;
      
      let selectedLeft = null;
      let selectedRight = null;
      let matchedCount = 0;
      let lockout = false;
      
      const leftBtns = document.querySelectorAll('.match-btn-l');
      const rightBtns = document.querySelectorAll('.match-btn-r');
      
      function checkMatch() {
        if (!selectedLeft || !selectedRight) return;
        lockout = true;
        
        const leftId = selectedLeft.getAttribute('data-id');
        const rightId = selectedRight.getAttribute('data-id');
        
        if (leftId === rightId) {
          // Success match
          selectedLeft.classList.remove('selected');
          selectedRight.classList.remove('selected');
          selectedLeft.classList.add('matched');
          selectedRight.classList.add('matched');
          selectedLeft.disabled = true;
          selectedRight.disabled = true;
          
          selectedLeft = null;
          selectedRight = null;
          matchedCount++;
          lockout = false;
          
          if (matchedCount === item.pairs.length) {
            document.getElementById('matching-feedback').innerHTML = '<p style="color: var(--success); margin-top: 15px; font-weight: bold; text-align: center;">🎉 All matched correctly!</p>';
            document.getElementById('course-next-btn').classList.remove('hidden');
          }
        } else {
          // Mismatch
          const cardL = selectedLeft;
          const cardR = selectedRight;
          
          cardL.classList.remove('selected');
          cardR.classList.remove('selected');
          cardL.classList.add('mismatched');
          cardR.classList.add('mismatched');
          
          setTimeout(() => {
            cardL.classList.remove('mismatched');
            cardR.classList.remove('mismatched');
            selectedLeft = null;
            selectedRight = null;
            lockout = false;
          }, 600);
        }
      }
      
      leftBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled || lockout) return;
          
          // Clear active selection in same column
          leftBtns.forEach(b => b.classList.remove('selected'));
          
          if (selectedLeft === btn) {
            // Toggle selection
            selectedLeft = null;
          } else {
            btn.classList.add('selected');
            selectedLeft = btn;
            checkMatch();
          }
        });
      });
      
      rightBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled || lockout) return;
          
          // Clear active selection in same column
          rightBtns.forEach(b => b.classList.remove('selected'));
          
          if (selectedRight === btn) {
            // Toggle selection
            selectedRight = null;
          } else {
            btn.classList.add('selected');
            selectedRight = btn;
            checkMatch();
          }
        });
      });
      
      document.getElementById('course-next-btn').addEventListener('click', () => { currentItem++; showItem(); });
    }
    else if (item.type === 'shortanswer') {
      body.innerHTML = `
        <div class="quiz-question">
          ${headerHtml}
          <h4>${item.question}</h4>
          <div style="margin-top: 15px; margin-bottom: 15px;">
            <input type="text" id="shortanswer-input" placeholder="Type your answer here..." style="width:100%; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:12px; border-radius:var(--radius-sm); font-size:14px;" autocomplete="off" />
          </div>
          <div id="course-feedback-area"></div>
          <button class="btn btn-primary" id="shortanswer-submit-btn" style="width: 100%;">Submit Answer</button>
        </div>
      `;
      
      const inputEl = document.getElementById('shortanswer-input');
      const submitBtn = document.getElementById('shortanswer-submit-btn');
      
      inputEl.focus();
      inputEl.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') submitBtn.click();
      });
      
      submitBtn.addEventListener('click', () => {
        const val = inputEl.value.trim();
        if(!val) return;
        
        inputEl.disabled = true;
        submitBtn.classList.add('hidden');
        
        const checkResult = checkSpelledAnswerClose(val, item.answer);
        
        if (checkResult.isCorrect) {
          const spellingNotice = checkResult.isExact ? '' : ` (Spelling corrected to: <strong>${item.answer}</strong>)`;
          document.getElementById('course-feedback-area').innerHTML = `
            <div class="quiz-feedback correct" style="margin-bottom:15px;">Correct!${spellingNotice} ${item.explanation}</div>
            <button class="btn btn-primary" id="course-next-btn" style="width:100%;">Next</button>
          `;
        } else {
          document.getElementById('course-feedback-area').innerHTML = `
            <div class="quiz-feedback wrong" style="margin-bottom:15px;">Incorrect. The correct answer is: <strong>${item.answer}</strong>.<br><br>${item.explanation}</div>
            <button class="btn btn-primary" id="course-next-btn" style="width:100%;">Next</button>
          `;
        }
        
        document.getElementById('course-next-btn').addEventListener('click', () => {
          currentItem++;
          showItem();
        });
      });
    }
    else {
      // Fallback
      currentItem++; showItem();
    }
    
    renderMath(body);
  }
  
  showItem();
}

document.getElementById('course-modal-close').addEventListener('click', () => {
  document.getElementById('course-modal').classList.add('hidden');
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
  const dashActive = document.getElementById('dash-active-course-card');
  if(dashActive) dashActive.addEventListener('click', () => {
    resumeActiveCourse();
  });

  const dashQuiz = document.getElementById('dash-quiz-card');
  if(dashQuiz) dashQuiz.addEventListener('click', () => {
    const subjects = Object.keys(extendedTopics);
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const topics = extendedTopics[randomSubject];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    generateQuiz(randomSubject, randomTopic);
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
      const prompt = `Create a 20 question multiple choice quiz covering a variety of topics from different subjects. Prioritize topics from the following subjects: ${safeFocus}. Include questions from Maths, Science, Systems Technology, English, History, Media Studies. Ensure questions are highly unique, diverse, and randomized to avoid repeating common questions. Return ONLY a JSON array of objects, where each object has: "question" (string), "options" (array of 4 strings), "answer" (index of correct option 0-3), "explanation" (string explaining the answer). NO MARKDOWN BLOCKS, JUST RAW JSON ARRAY.`;
      
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
