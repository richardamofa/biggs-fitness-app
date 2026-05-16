/* relies on sb from supabase.js — load that first */
/* Show avatar instantly from cache */
(function () {
    const cached = localStorage.getItem("bf_user_name");
    if (cached) {
        const el = document.getElementById("topbarAvatar");
        if (el) el.textContent = cached
            .split(" ")
            .map(w => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }
})();

/* State */
let currentUser    = null;
let currentProfile = null;
let sessionData    = null;
let completedCount = 0;
let startTime      = null;
let timerInterval  = null;

/* Init */
async function initQuickSession() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

    currentUser = user;

    const { data: profile } = await sb
        .from("profiles")
        .select("fitness_level, equipment")
        .eq("user_id", user.id)
        .maybeSingle();

    currentProfile = profile;
}

/* Generate quick session from backend */
async function generateQuickSession() {
    const btn = document.getElementById("generateBtn");

    const { plan } = await getUserPlan();

    // Starter: enforce 3 quick sessions per month cap
    if (plan === "starter") {
        const { withinLimit } = await checkMonthlyLimit(currentUser.id, "quick_session");
        if (!withinLimit) {
            showUpgradeModal("pro", "Unlimited Quick Sessions");
            return;
        }
    }

    btn.textContent = "Getting your session...";
    btn.disabled    = true;

    try {
        const res = await fetch("http://localhost:3000/api/ai/quick-session", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                fitness_level: currentProfile?.fitness_level || "beginner",
                equipment:     currentProfile?.equipment     || "none"
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showError(data.error || "Failed to generate session.");
            return;
        }

        sessionData = data.session;
        renderSession(data.session);

    } catch (err) {
        console.error("quickSession error:", err);
        showError("Could not reach server. Is your backend running?");
    } finally {
        btn.textContent = "Generate Another";
        btn.disabled    = false;
    }
}

/* Render session */
function renderSession(session) {
    const container = document.getElementById("sessionContainer");
    const intro     = document.getElementById("sessionIntro");

    if (!container) return;
    if (intro) intro.style.display = "none";

    completedCount = 0;

    container.innerHTML = `
        <div class="qs-header">
            <div>
                <h3 class="qs-title">${session.title}</h3>
                <p class="qs-meta">${session.duration} mins · ${session.exercises.length} exercises</p>
            </div>
            <div class="qs-timer" id="qsTimer">00:00</div>
        </div>

        <div class="qs-progress-bar">
            <div class="qs-progress-fill" id="qsProgress" style="width:0%"></div>
        </div>

        <div class="qs-exercises" id="qsExerciseList">
            ${session.exercises.map((ex, i) => `
                <div class="qs-exercise-card" id="qs-ex-${i}">
                    <div class="qs-exercise-info">
                        <h4>${ex.name}</h4>
                        <p>${ex.sets} sets · ${ex.reps} reps · Rest ${ex.rest}</p>
                    </div>
                    <button
                        class="qs-done-btn"
                        id="qs-btn-${i}"
                        onclick="completeQsExercise(${i})"
                    >
                        Done
                    </button>
                </div>
            `).join("")}
        </div>
    `;

    startTimer();
}

/* Timer */
function startTimer() {
    startTime = Date.now();
    const timerEl = document.getElementById("qsTimer");

    timerInterval = setInterval(() => {
        if (!timerEl) return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins    = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs    = (elapsed % 60).toString().padStart(2, "0");
        timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

/* Complete exercise */
function completeQsExercise(index) {
    const card = document.getElementById(`qs-ex-${index}`);
    const btn  = document.getElementById(`qs-btn-${index}`);

    if (!card || btn.dataset.done === "true") return;

    card.classList.add("completed");
    btn.textContent  = "✓";
    btn.dataset.done = "true";
    btn.disabled     = true;

    completedCount++;

    const progress = document.getElementById("qsProgress");
    if (progress) {
        const pct = Math.round((completedCount / sessionData.exercises.length) * 100);
        progress.style.width = pct + "%";
    }

    if (completedCount >= sessionData.exercises.length) {
        setTimeout(finishQuickSession, 600);
    }
}

/* Finish and save */
async function finishQuickSession() {
    clearInterval(timerInterval);

    const duration = Math.round((Date.now() - startTime) / 60000);
    const calories = Math.round(duration * 5);

    // save to sessions table
    await sb.from("sessions").insert({
        user_id:      currentUser.id,
        workout_name: sessionData.title + " (Quick)",
        duration,
        calories,
        exercises:    sessionData.exercises.map(ex => ({ ...ex, completed: true })),
        completed_at: new Date()
    });

    // update progress — sessions/mins/calories ONLY
    // streak and last_workout_date are intentionally NOT updated here
    // those only update when the user completes a full planned workout
    const { data: progress } = await sb
        .from("progress")
        .select("total_sessions, total_mins, total_calories")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (progress) {
        await sb.from("progress").update({
            total_sessions: (progress.total_sessions || 0) + 1,
            total_mins:     (progress.total_mins     || 0) + duration,
            total_calories: (progress.total_calories || 0) + calories,
            updated_at:     new Date()
        }).eq("user_id", currentUser.id);
    }

    // show done screen
    const container = document.getElementById("sessionContainer");
    if (container) {
        container.innerHTML = `
            <div class="completion-screen">
                <div class="completion-icon">⚡</div>
                <h2>Quick Session Done!</h2>
                <p>You showed up even when you didn't feel like it. That's the real win.</p>
                <div class="completion-stats">
                    <div class="comp-stat">
                        <span class="comp-val">${duration}</span>
                        <span class="comp-label">Minutes</span>
                    </div>
                    <div class="comp-stat">
                        <span class="comp-val">${calories}</span>
                        <span class="comp-label">Calories</span>
                    </div>
                </div>
                <div class="completion-actions">
                    <a href="../../dashboard/index.html" class="btn">Back to Dashboard</a>
                    <button class="btn btn-outline" onclick="location.reload()">Do Another</button>
                </div>
            </div>
        `;
    }
}

/* Error helper */
function showError(msg) {
    const el = document.getElementById("sessionError");
    if (!el) return;
    el.textContent   = msg;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 4000);
}

/* Sidebar toggle */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
const menuBtn = document.getElementById("menuToggle");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.add("open");
        overlay.classList.add("open");
    });
}
if (overlay) {
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
    });
}

/* Offline fallback helper */
async function fetchWithFallback(url, options, cacheKey) {
    if (!navigator.onLine) {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }

    try {
        const res  = await fetch(url, options);
        const data = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
}

/* Logout */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await sb.auth.signOut();
        localStorage.removeItem("bf_user_name");
        window.location.href = "../../form/login/index.html";
    });
}

/* Run */
initQuickSession();