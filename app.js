// ===== Bible Reading App - 3 Chapters Daily (New Testament Only) =====
// Always 3 NT chapters per day
// Start Date: May 13, 2026

// ===== User PIN Codes =====
const USER_PINS = {
    user1: "2721",  // Besu's PIN
    user2: "2324"   // Rekik's PIN
};

// ===== Vercel Blob Cloud Storage Integration =====
const API_BASE_URL = window.location.origin + '/api';

let lastCloudSave = 0;
const CLOUD_SAVE_DEBOUNCE = 2000;

// User management
let currentUser = null;
let otherUser = null;
let viewingOtherUser = false;
let pendingUser = null;

// Progress storage
let userProgress = {
    user1: { completedDays: [], name: "Besu" },
    user2: { completedDays: [], name: "Rekik" }
};

// ===== New Testament Bible Data (Only NT) =====
const ntBooks = [
    { name: "Matthew", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
    { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 }, { name: "Romans", chapters: 16 },
    { name: "1 Corinthians", chapters: 16 }, { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
    { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 }, { name: "Colossians", chapters: 4 },
    { name: "1 Thessalonians", chapters: 5 }, { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 },
    { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 }, { name: "Philemon", chapters: 1 },
    { name: "Hebrews", chapters: 13 }, { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
    { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 },
    { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 }
];

// Reading plan structure
let readingPlan = [];
const START_DATE = new Date(2026, 4, 13); // May 13, 2026 (month is 0-indexed, so 4 = May)

function generateReadingPlan() {
    const plan = [];
    let ntBookIndex = 0, ntChapter = 1;
    let day = 1;
    const CHAPTERS_PER_DAY = 3;
    
    while (ntBookIndex < ntBooks.length) {
        const reading = {
            day: day,
            ntPassages: [],
            completed: false,
            isCurrent: false,
            date: null
        };
        
        let chaptersAdded = 0;
        
        while (chaptersAdded < CHAPTERS_PER_DAY && ntBookIndex < ntBooks.length) {
            const book = ntBooks[ntBookIndex];
            const remainingInBook = book.chapters - ntChapter + 1;
            const toTake = Math.min(CHAPTERS_PER_DAY - chaptersAdded, remainingInBook);
            
            if (toTake === 1) {
                reading.ntPassages.push({ book: book.name, chapter: ntChapter });
            } else {
                reading.ntPassages.push({
                    book: book.name,
                    startChapter: ntChapter,
                    endChapter: ntChapter + toTake - 1
                });
            }
            
            ntChapter += toTake;
            chaptersAdded += toTake;
            
            if (ntChapter > book.chapters) {
                ntBookIndex++;
                ntChapter = 1;
            }
        }
        
        plan.push(reading);
        day++;
        
        // Safety break to prevent infinite loop
        if (day > 500) break;
    }
    
    return plan;
}

readingPlan = generateReadingPlan();

function assignDatesToPlan() {
    readingPlan.forEach((day, index) => {
        const date = new Date(START_DATE);
        date.setDate(START_DATE.getDate() + index);
        day.date = date;
    });
}
assignDatesToPlan();

// ===== Storage Functions =====
function saveLocalProgress(userId, completedDays) {
    localStorage.setItem(`bible-reading-${userId}`, JSON.stringify(completedDays));
    console.log(`Saved locally for ${userId}: ${completedDays.length} days`);
}

function loadLocalProgress(userId) {
    const stored = localStorage.getItem(`bible-reading-${userId}`);
    return stored ? JSON.parse(stored) : [];
}

async function saveProgressToCloud(userId, completedDays, force = false) {
    const now = Date.now();
    if (!force && now - lastCloudSave < CLOUD_SAVE_DEBOUNCE) return false;
    try {
        const response = await fetch(`${API_BASE_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, completedDays })
        });
        if (!response.ok) throw new Error('Cloud save failed');
        lastCloudSave = now;
        console.log(`Cloud saved for ${userId}: ${completedDays.length} days`);
        return true;
    } catch (error) {
        console.error('Cloud save error:', error);
        return false;
    }
}

async function loadProgressFromCloud(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sync?user=${userId}`);
        if (!response.ok) throw new Error('Cloud load failed');
        const data = await response.json();
        return data.completedDays || [];
    } catch (error) {
        console.error('Cloud load error:', error);
        return null;
    }
}

async function syncProgressForUser(userId) {
    const cloudDays = await loadProgressFromCloud(userId);
    const localDays = loadLocalProgress(userId);
    
    if (cloudDays && cloudDays.length > 0) {
        if (cloudDays.length >= localDays.length) {
            return cloudDays;
        } else {
            await saveProgressToCloud(userId, localDays, true);
            return localDays;
        }
    }
    return localDays;
}

function saveAllProgress() {
    if (currentUser) {
        saveLocalProgress(currentUser, userProgress[currentUser].completedDays);
        saveProgressToCloud(currentUser, userProgress[currentUser].completedDays);
    }
}

// ===== Statistics Functions =====
function calculateStatistics(userId) {
    const completedDaysArray = userProgress[userId].completedDays;
    const completedCount = completedDaysArray.length;
    const totalDays = readingPlan.length;
    const percentage = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
    
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayDayNum = null;
    for (const day of readingPlan) {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        if (dayDate.getTime() === today.getTime()) {
            todayDayNum = day.day;
            break;
        }
    }
    
    if (todayDayNum) {
        for (let d = todayDayNum; d >= 1; d--) {
            if (completedDaysArray.includes(d)) {
                currentStreak++;
            } else {
                break;
            }
        }
    } else if (completedDaysArray.length > 0) {
        const sorted = [...completedDaysArray].sort((a, b) => b - a);
        let expected = sorted[0];
        while (completedDaysArray.includes(expected)) {
            currentStreak++;
            expected--;
            if (expected < 1) break;
        }
    }
    
    let ntChaptersRead = 0;
    
    completedDaysArray.forEach(dayNum => {
        const day = readingPlan[dayNum - 1];
        if (day) {
            day.ntPassages.forEach(p => {
                if (p.chapter) ntChaptersRead += 1;
                else if (p.startChapter && p.endChapter) ntChaptersRead += (p.endChapter - p.startChapter + 1);
            });
        }
    });
    
    return {
        completedDays: completedCount,
        totalDays: totalDays,
        percentage: percentage,
        currentStreak: currentStreak,
        ntChaptersRead: ntChaptersRead,
        totalChaptersRead: ntChaptersRead
    };
}

function updateStatistics(viewing = false) {
    const targetUser = viewing ? otherUser : currentUser;
    if (!targetUser) return;
    
    const stats = calculateStatistics(targetUser);
    
    const completedEl = document.getElementById('stat-completed');
    const percentageEl = document.getElementById('stat-percentage');
    const streakEl = document.getElementById('stat-streak');
    const ntReadEl = document.getElementById('stat-nt-read');
    const totalChaptersEl = document.getElementById('stat-total-chapters');
    
    if (completedEl) completedEl.textContent = stats.completedDays;
    if (percentageEl) percentageEl.textContent = `${stats.percentage}%`;
    if (streakEl) streakEl.textContent = stats.currentStreak;
    if (ntReadEl) ntReadEl.textContent = stats.ntChaptersRead;
    if (totalChaptersEl) totalChaptersEl.textContent = stats.totalChaptersRead;
}

function updateProgressBar() {
    const targetUser = viewingOtherUser ? otherUser : currentUser;
    if (!targetUser) return;
    
    const completedCount = userProgress[targetUser].completedDays.length;
    const totalDays = readingPlan.length;
    const percentage = totalDays > 0 ? (completedCount / totalDays) * 100 : 0;
    
    const completedCountEl = document.getElementById('completed-count');
    const totalDaysEl = document.getElementById('total-days');
    const progressFillEl = document.getElementById('progress-fill');
    
    if (completedCountEl) completedCountEl.textContent = completedCount;
    if (totalDaysEl) totalDaysEl.textContent = totalDays;
    if (progressFillEl) progressFillEl.style.width = `${percentage}%`;
}

function updateCurrentDay() {
    readingPlan.forEach(day => day.isCurrent = false);
    for (let i = 0; i < readingPlan.length; i++) {
        if (!readingPlan[i].completed) {
            readingPlan[i].isCurrent = true;
            break;
        }
    }
}

function toggleDay(dayNum) {
    if (viewingOtherUser) {
        showToast("Cannot edit another user's progress", "warning");
        return;
    }
    
    if (!currentUser) {
        showToast("No user selected", "error");
        return;
    }
    
    const day = readingPlan.find(d => d.day === dayNum);
    if (!day) return;
    
    day.completed = !day.completed;
    
    userProgress[currentUser].completedDays = readingPlan
        .filter(d => d.completed)
        .map(d => d.day)
        .sort((a, b) => a - b);
    
    saveAllProgress();
    
    updateCurrentDay();
    renderReadingList(false);
    updateProgressBar();
    renderCalendar(false);
    updateTodayHighlight(false);
    updateStatistics(false);
    
    const card = document.querySelector(`.day-card[data-day="${dayNum}"]`);
    if (card) {
        card.style.transform = 'scale(0.98)';
        setTimeout(() => card.style.transform = '', 150);
    }
    
    if (day.completed) {
        showToast(`✓ Day ${dayNum} marked as read! 📖`, "success");
    } else {
        showToast(`Day ${dayNum} marked as unread`, "info");
    }
}

function formatPassage(ntPassages) {
    let html = '';
    
    if (ntPassages && ntPassages.length > 0) {
        html += `<div class="passage-nt">`;
        html += `<span class="testament-label NT">NT</span>`;
        html += `<span class="passage-text">`;
        ntPassages.forEach((p, i) => {
            if (p.chapter) html += `${p.book} ${p.chapter}`;
            else if (p.startChapter && p.endChapter) {
                if (p.startChapter === p.endChapter) html += `${p.book} ${p.startChapter}`;
                else html += `${p.book} ${p.startChapter}-${p.endChapter}`;
            }
            if (i < ntPassages.length - 1) html += `, `;
        });
        html += `</span></div>`;
    }
    
    return html || '<span class="no-reading">No reading assigned</span>';
}

function renderReadingList(viewing = false) {
    const container = document.getElementById('reading-list');
    if (!container) return;
    container.innerHTML = '';
    
    readingPlan.forEach(day => {
        const passageHTML = formatPassage(day.ntPassages);
        const dateText = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const daySuffix = (day.day >= 11 && day.day <= 13) ? 'th' : ['st', 'nd', 'rd'][(day.day % 10) - 1] || 'th';
        
        const dayCard = document.createElement('div');
        dayCard.className = `day-card ${day.completed ? 'completed' : ''} ${day.isCurrent ? 'current' : ''}`;
        dayCard.setAttribute('data-day', day.day);
        
        dayCard.innerHTML = `
            <div class="card-left">
                <div class="day-badge">
                    <span class="day-number-large">${day.day}</span>
                    <span class="day-suffix">${daySuffix}</span>
                </div>
                <div class="date-badge">
                    <span class="date-icon">📅</span>
                    <span class="date-text">${dateText}</span>
                </div>
            </div>
            <div class="card-middle">
                <div class="passage-container">${passageHTML}</div>
                <div class="reading-meta">
                    ${day.isCurrent ? '<span class="current-badge">Current Reading</span>' : ''}
                </div>
            </div>
            <div class="card-right">
                <label class="checkbox-wrapper ${viewing ? 'disabled' : ''}">
                    <input type="checkbox" ${day.completed ? 'checked' : ''} data-day="${day.day}" ${viewing ? 'disabled' : ''}>
                    <span class="checkbox-custom">
                        <svg class="checkbox-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                        </svg>
                    </span>
                </label>
                <div class="completion-status ${day.completed ? 'completed' : ''}">
                    ${day.completed ? 'Read' : 'Mark Read'}
                </div>
            </div>
        `;
        container.appendChild(dayCard);
    });
    
    if (!viewing) {
        document.querySelectorAll('.checkbox-wrapper input:not([disabled])').forEach(checkbox => {
            checkbox.removeEventListener('change', handleCheckboxChange);
            checkbox.addEventListener('change', handleCheckboxChange);
        });
    }
}

function handleCheckboxChange(e) {
    e.stopPropagation();
    toggleDay(parseInt(e.target.dataset.day));
}

let currentCalendarDate = new Date();

function renderCalendar(viewing = false) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthDisplay = document.getElementById('month-year-display');
    if (monthDisplay) {
        monthDisplay.textContent = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = document.getElementById('calendar-days');
    if (!calendarDays) return;
    calendarDays.innerHTML = '';
    
    for (let i = 0; i < startingDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        calendarDays.appendChild(empty);
    }
    
    const targetUser = viewing ? otherUser : currentUser;
    const completedSet = new Set(targetUser ? userProgress[targetUser]?.completedDays : []);
    
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const readingDay = readingPlan.find(d => {
            const dDate = new Date(d.date);
            dDate.setHours(0, 0, 0, 0);
            return dDate.getTime() === date.getTime();
        });
        
        let dayContent = `<span class="day-number">${day}</span>`;
        
        if (readingDay) {
            dayElement.classList.add('has-reading');
            if (completedSet.has(readingDay.day)) {
                dayElement.classList.add('completed-reading');
            }
            dayContent += `<span class="reading-indicator"></span>`;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date.getTime() === today.getTime()) {
            dayElement.classList.add('today');
            dayContent += `<span class="today-indicator">Today</span>`;
        }
        
        dayElement.innerHTML = dayContent;
        calendarDays.appendChild(dayElement);
    }
}

function updateTodayHighlight(viewing = false) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayReading = readingPlan.find(d => {
        const dDate = new Date(d.date);
        dDate.setHours(0, 0, 0, 0);
        return dDate.getTime() === today.getTime();
    });
    
    const highlightElement = document.getElementById('today-highlight');
    if (!highlightElement) return;
    
    const targetUser = viewing ? otherUser : currentUser;
    const isCompleted = todayReading && targetUser && 
        userProgress[targetUser]?.completedDays.includes(todayReading.day);
    
    if (todayReading) {
        const passageHTML = formatPassage(todayReading.ntPassages);
        const dateText = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        
        highlightElement.innerHTML = `
            <div class="today-header">
                <div class="today-icon">📖</div>
                <div class="today-title-section">
                    <span class="today-label">Today's Reading</span>
                    <span class="today-full-date">${dateText}</span>
                </div>
            </div>
            <div class="today-content">
                <div class="today-passage-section">
                    <div class="today-day">Day ${todayReading.day}</div>
                    <div class="today-passage">${passageHTML}</div>
                </div>
                <button class="btn-mark-read ${isCompleted ? 'completed' : ''}" data-day="${todayReading.day}" ${isCompleted || viewing ? 'disabled' : ''}>
                    <span class="btn-icon">${isCompleted ? '✓' : '◉'}</span>
                    <span class="btn-text">${isCompleted ? 'Completed' : 'Mark as Read'}</span>
                </button>
            </div>
        `;
        
        if (!viewing && !isCompleted) {
            const btn = highlightElement.querySelector('.btn-mark-read');
            if (btn) {
                btn.removeEventListener('click', handleTodayClick);
                btn.addEventListener('click', handleTodayClick);
            }
        }
    } else {
        highlightElement.innerHTML = `<div class="today-header"><div class="today-icon">📖</div><div class="today-title-section"><span class="today-label">Reading Plan</span></div></div>
            <div class="today-content"><div class="today-message">Continue your daily reading journey! 📚</div></div>`;
    }
}

function handleTodayClick(e) {
    const btn = e.currentTarget;
    const dayNum = parseInt(btn.dataset.day);
    toggleDay(dayNum);
}

// ===== User Management =====
function showPinModal(userId) {
    pendingUser = userId;
    let userName = "";
    if (userId === 'user1') userName = "Besu";
    else if (userId === 'user2') userName = "Rekik";
    
    const nameEl = document.getElementById('pin-user-name');
    if (nameEl) nameEl.textContent = userName;
    
    const modal = document.getElementById('pin-modal');
    if (modal) modal.style.display = 'flex';
    
    const errorEl = document.getElementById('pin-error');
    if (errorEl) errorEl.style.display = 'none';
    
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`pin-${i}`);
        if (input) input.value = '';
    }
    
    setTimeout(() => document.getElementById('pin-1')?.focus(), 100);
    
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`pin-${i}`);
        if (input) {
            input.removeEventListener('input', handlePinInput);
            input.addEventListener('input', handlePinInput);
            input.removeEventListener('keydown', handlePinKeyDown);
            input.addEventListener('keydown', handlePinKeyDown);
        }
    }
}

function handlePinKeyDown(e) {
    const input = e.target;
    const id = parseInt(input.id.split('-')[1]);
    
    if (e.key === 'Backspace' && input.value.length === 0 && id > 1) {
        e.preventDefault();
        const prevInput = document.getElementById(`pin-${id - 1}`);
        if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
        }
    }
}

function handlePinInput(e) {
    const input = e.target;
    const id = parseInt(input.id.split('-')[1]);
    
    if (input.value.length === 1) {
        if (id < 4) {
            document.getElementById(`pin-${id + 1}`)?.focus();
        } else if (id === 4) {
            setTimeout(() => verifyPin(), 100);
        }
    }
}

function getEnteredPin() {
    let pin = '';
    for (let i = 1; i <= 4; i++) {
        pin += document.getElementById(`pin-${i}`)?.value || '';
    }
    return pin;
}

function verifyPin() {
    const enteredPin = getEnteredPin();
    const correctPin = USER_PINS[pendingUser];
    
    if (enteredPin === correctPin) {
        document.getElementById('pin-modal').style.display = 'none';
        completeUserSelection(pendingUser);
    } else {
        const errorEl = document.getElementById('pin-error');
        if (errorEl) errorEl.style.display = 'block';
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById(`pin-${i}`);
            if (input) input.value = '';
        }
        document.getElementById('pin-1')?.focus();
    }
}

function cancelPinModal() {
    document.getElementById('pin-modal').style.display = 'none';
    pendingUser = null;
}

function completeUserSelection(userId) {
    currentUser = userId;
    viewingOtherUser = false;
    otherUser = null;
    
    document.getElementById('user-selector').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('viewing-banner').style.display = 'none';
    
    const viewBtn = document.getElementById('view-other-btn');
    if (viewBtn) {
        if (currentUser === 'user1') {
            viewBtn.textContent = `👥 View Rekik`;
        } else if (currentUser === 'user2') {
            viewBtn.textContent = `👥 View Besu`;
        }
    }
    
    loadUserProgress();
    
    let welcomeName = "";
    if (userId === 'user1') welcomeName = "Besu";
    else if (userId === 'user2') welcomeName = "Rekik";
    
    showToast(`Welcome, ${welcomeName}! ✝️`, "success");
}

function selectUser(userId) {
    showPinModal(userId);
}

function viewOtherUser() {
    if (!currentUser) return;
    viewingOtherUser = true;
    
    let availableUsers = [];
    
    if (currentUser === 'user1') {
        availableUsers = ['user2'];
    } else if (currentUser === 'user2') {
        availableUsers = ['user1'];
    }
    
    if (availableUsers.length === 0) {
        showToast("No other users available to view", "warning");
        viewingOtherUser = false;
        return;
    }
    
    otherUser = availableUsers[0];
    
    const banner = document.getElementById('viewing-banner');
    if (banner) {
        banner.style.display = 'flex';
        const span = banner.querySelector('span');
        if (span) {
            let otherName = "";
            if (otherUser === 'user1') otherName = "Besu";
            else if (otherUser === 'user2') otherName = "Rekik";
            span.textContent = `👁️ Viewing ${otherName}'s progress`;
        }
    }
    loadUserProgress(true);
}

function switchBackToSelf() {
    viewingOtherUser = false;
    otherUser = null;
    document.getElementById('viewing-banner').style.display = 'none';
    loadUserProgress();
}

function switchUser() {
    viewingOtherUser = false;
    otherUser = null;
    currentUser = null;
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('user-selector').style.display = 'flex';
    document.getElementById('viewing-banner').style.display = 'none';
    showToast("Select a user", "info");
}

async function loadUserProgress(viewing = false) {
    const targetUser = viewing ? otherUser : currentUser;
    if (!targetUser) return;
    
    const completedDays = await syncProgressForUser(targetUser);
    userProgress[targetUser].completedDays = completedDays;
    
    readingPlan.forEach(day => {
        day.completed = completedDays.includes(day.day);
    });
    
    updateCurrentDay();
    renderReadingList(viewing);
    updateProgressBar();
    renderCalendar(viewing);
    updateTodayHighlight(viewing);
    updateStatistics(viewing);
}

function showToast(message, type = "info") {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.className = 'toast', 3000);
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    const existing1 = loadLocalProgress('user1');
    const existing2 = loadLocalProgress('user2');
    
    userProgress.user1.completedDays = existing1;
    userProgress.user2.completedDays = existing2;
    
    existing1.forEach(day => {
        if (readingPlan[day - 1]) readingPlan[day - 1].completed = true;
    });
    existing2.forEach(day => {
        if (readingPlan[day - 1]) readingPlan[day - 1].completed = true;
    });
    
    document.getElementById('select-user1')?.addEventListener('click', () => selectUser('user1'));
    document.getElementById('select-user2')?.addEventListener('click', () => selectUser('user2'));
    document.getElementById('pin-submit')?.addEventListener('click', verifyPin);
    document.getElementById('pin-cancel')?.addEventListener('click', cancelPinModal);
    document.getElementById('view-other-btn')?.addEventListener('click', viewOtherUser);
    document.getElementById('back-to-self-btn')?.addEventListener('click', switchBackToSelf);
    document.getElementById('switch-user-btn')?.addEventListener('click', switchUser);
    
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar(viewingOtherUser);
    });
    document.getElementById('next-month')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar(viewingOtherUser);
    });
    
    document.getElementById('pin-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('pin-modal')) cancelPinModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('pin-modal')?.style.display === 'flex' && e.key === 'Enter') {
            verifyPin();
        }
    });
});
