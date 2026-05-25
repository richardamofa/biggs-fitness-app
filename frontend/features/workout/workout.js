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
let exercises      = [];
let completedCount = 0;
let startTime      = null;
let timerInterval  = null;

/* Rest day screen — module scope */
function showRestDayScreen() {
    clearInterval(timerInterval);

    const messages = [
        {
            emoji:   "🛌",
            title:   "Rest Day. Earned It.",
            message: "Your muscles grow when you rest, not when you train. Today is part of the plan — trust it.",
            tip:     "Stay hydrated, eat well and get good sleep tonight.",
            color:   "#818cf8",
            bg:      "rgba(99,102,241,0.08)"
        },
        {
            emoji:   "💆🏾‍♂️",
            title:   "Recovery Mode: ON",
            message: "The best athletes in the world treat rest days as seriously as training days. Today you recover so tomorrow you dominate.",
            tip:     "Try a 10-minute stretch or a short walk to keep the blood flowing.",
            color:   "#22c55e",
            bg:      "rgba(34,197,94,0.08)"
        },
        {
            emoji:   "🔋",
            title:   "Recharging.",
            message: "You can't pour from an empty cup. Rest today so you can push harder tomorrow. Your body is doing the work even while you sleep.",
            tip:     "Foam roll, stretch or just chill — all valid options today.",
            color:   "#38bdf8",
            bg:      "rgba(56,189,248,0.08)"
        },
        {
            emoji:   "🏆",
            title:   "Champions Rest Too.",
            message: "Rest isn't weakness — it's strategy. Every elite athlete schedules recovery. You're not skipping today, you're investing in tomorrow.",
            tip:     "Focus on nutrition today. Protein and water are your best friends.",
            color:   "#f59e0b",
            bg:      "rgba(245,158,11,0.08)"
        },
        {
            emoji:   "🌿",
            title:   "Active Recovery Day",
            message: "No weights, no pressure. Your body has been working hard and it deserves this. Light movement, good food and quality rest is the formula.",
            tip:     "A 20-minute walk counts as active recovery — no gym required.",
            color:   "#fb923c",
            bg:      "rgba(251,146,60,0.08)"
        }
    ];

    const msg       = messages[Math.floor(Math.random() * messages.length)];
    const container = document.getElementById("workoutContainer");
    if (!container) return;

    const progressWrap = document.getElementById("progressWrap");
    if (progressWrap) progressWrap.style.display = "none";

    container.innerHTML = `
        <div class="rest-day-screen">
            <div class="rest-day-emoji">${msg.emoji}</div>
            <h2 class="rest-day-title">${msg.title}</h2>
            <p class="rest-day-message">${msg.message}</p>

            <div class="rest-day-tip" style="background:${msg.bg};border-color:${msg.color}30;">
                <span class="rest-day-tip-label" style="color:${msg.color}">💡 Today's tip</span>
                <p>${msg.tip}</p>
            </div>

            <div class="rest-day-stats">
                <div class="rest-day-stat">
                    <span class="rest-stat-icon">💪</span>
                    <p>Keep your <strong>streak alive</strong> by showing up again tomorrow</p>
                </div>
                <div class="rest-day-stat">
                    <span class="rest-stat-icon">🥗</span>
                    <p>Fuel your recovery with <strong>protein-rich food</strong> today</p>
                </div>
                <div class="rest-day-stat">
                    <span class="rest-stat-icon">😴</span>
                    <p>Aim for <strong>7-9 hours of sleep</strong> tonight for muscle repair</p>
                </div>
            </div>

            <div class="rest-day-actions">
                <a href="../../dashboard/index.html" class="btn">Back to Dashboard</a>
                <a href="../quick-suggestion/index.html" class="btn btn-outline">
                    Quick Session Instead?
                </a>
            </div>
        </div>
    `;
}

/* Init */
async function initWorkout() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

    const ADMIN_IDS = ["dc8dac26-975b-4861-b313-49ac1efc22f3"];
    if (ADMIN_IDS.includes(user.id)) {
        const adminNavItem = document.getElementById("adminNavItem");
        if (adminNavItem) adminNavItem.style.display = "flex";
    }

    currentUser = user;

    const { data: profile } = await sb
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    currentProfile = profile;

    const params      = new URLSearchParams(window.location.search);
    let   workoutName = params.get("workout");
    let   dayIndex    = params.get("day");

    // no URL params — user came from sidebar nav, detect today's workout
    if (!workoutName) {
        const todayIdx = (new Date().getDay() + 6) % 7;

        const { data: planRow } = await sb
            .from("plans")
            .select("plan_data")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        const DEFAULT_PLAN = [
            { workout: "Push Day",  exercises: 6, duration: 45 },
            { workout: "Pull Day",  exercises: 6, duration: 45 },
            { workout: "Leg Day",   exercises: 6, duration: 45 },
            { workout: "Rest",      exercises: 0, duration: 0  },
            { workout: "Full Body", exercises: 6, duration: 45 },
            { workout: "Rest",      exercises: 0, duration: 0  },
            { workout: "Rest",      exercises: 0, duration: 0  },
        ];

        const days     = planRow?.plan_data?.days || DEFAULT_PLAN;
        const todayDay = days[todayIdx];

        workoutName = todayDay?.workout || "Today's Workout";
        dayIndex    = String(todayIdx);
    }

    const titleEl = document.getElementById("workoutTitle");
    if (titleEl) titleEl.textContent = workoutName;

    const isRestDay = workoutName?.toLowerCase().includes("rest");

    if (isRestDay) {
        showRestDayScreen();
        return;
    }

    await loadWorkoutExercises(user.id, dayIndex, workoutName);
}

/* Load exercises from saved plan */
async function loadWorkoutExercises(userId, dayIndex, workoutName) {
    const { data: planRow } = await sb
        .from("plans")
        .select("plan_data")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const equipment = currentProfile?.equipment || "none";

    if (planRow?.plan_data?.days && dayIndex !== null) {
        const day = planRow.plan_data.days[parseInt(dayIndex)];
        if (day?.exercises_detail) {
            exercises = day.exercises_detail;
        } else {
            exercises = getDefaultExercises(workoutName, equipment);
        }
    } else {
        exercises = getDefaultExercises(workoutName, equipment);
    }

    renderExercises();
}

/* Default exercises by workout type */
function getDefaultExercises(workoutName, equipment = "none") {
    const name = workoutName?.toLowerCase() || "";

    if (equipment === "none") {
        if (name.includes("push") || name.includes("chest") || name.includes("upper")) return [
            { name: "Push Ups",           sets: 4, reps: "12",      rest: "45s" },
            { name: "Wide Push Ups",      sets: 3, reps: "12",      rest: "45s" },
            { name: "Diamond Push Ups",   sets: 3, reps: "10",      rest: "45s" },
            { name: "Pike Push Ups",      sets: 3, reps: "10",      rest: "45s" },
            { name: "Tricep Dips",        sets: 3, reps: "12",      rest: "45s" },
            { name: "Plank",              sets: 3, reps: "45 sec",  rest: "30s" },
        ];
        if (name.includes("pull") || name.includes("back")) return [
            { name: "Superman Hold",      sets: 4, reps: "30 sec",  rest: "30s" },
            { name: "Reverse Snow Angel", sets: 3, reps: "15",      rest: "30s" },
            { name: "Prone Y Raises",     sets: 3, reps: "12",      rest: "30s" },
            { name: "Bodyweight Row",     sets: 3, reps: "10",      rest: "45s" },
            { name: "Glute Bridge",       sets: 3, reps: "15",      rest: "30s" },
            { name: "Dead Bug",           sets: 3, reps: "10",      rest: "30s" },
        ];
        if (name.includes("leg") || name.includes("lower")) return [
            { name: "Bodyweight Squats",  sets: 4, reps: "15",      rest: "45s" },
            { name: "Lunges",             sets: 3, reps: "10 each", rest: "45s" },
            { name: "Glute Bridges",      sets: 4, reps: "15",      rest: "30s" },
            { name: "Wall Sit",           sets: 3, reps: "45 sec",  rest: "45s" },
            { name: "Calf Raises",        sets: 4, reps: "20",      rest: "30s" },
            { name: "Jump Squats",        sets: 3, reps: "12",      rest: "45s" },
        ];
        if (name.includes("cardio") || name.includes("hiit")) return [
            { name: "Jumping Jacks",      sets: 4, reps: "30 sec",  rest: "20s" },
            { name: "High Knees",         sets: 4, reps: "30 sec",  rest: "20s" },
            { name: "Burpees",            sets: 3, reps: "10",      rest: "30s" },
            { name: "Mountain Climbers",  sets: 4, reps: "20",      rest: "20s" },
            { name: "Jump Squats",        sets: 3, reps: "12",      rest: "30s" },
        ];
        if (name.includes("core") || name.includes("ab")) return [
            { name: "Plank",              sets: 4, reps: "45 sec",  rest: "30s" },
            { name: "Crunches",           sets: 3, reps: "20",      rest: "30s" },
            { name: "Leg Raises",         sets: 3, reps: "15",      rest: "30s" },
            { name: "Russian Twists",     sets: 3, reps: "20",      rest: "30s" },
            { name: "Mountain Climbers",  sets: 3, reps: "20",      rest: "30s" },
        ];
        return [
            { name: "Push Ups",           sets: 3, reps: "12",      rest: "45s" },
            { name: "Bodyweight Squats",  sets: 3, reps: "15",      rest: "45s" },
            { name: "Plank",              sets: 3, reps: "45 sec",  rest: "30s" },
            { name: "Lunges",             sets: 3, reps: "10 each", rest: "45s" },
            { name: "Mountain Climbers",  sets: 3, reps: "20",      rest: "30s" },
            { name: "Glute Bridges",      sets: 3, reps: "15",      rest: "30s" },
        ];
    }

    if (name.includes("push")) return [
        { name: "Push Ups",          sets: 4, reps: "12",      rest: "45s" },
        { name: "Dumbbell Press",    sets: 4, reps: "10",      rest: "60s" },
        { name: "Shoulder Press",    sets: 3, reps: "10",      rest: "60s" },
        { name: "Tricep Dips",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Lateral Raises",    sets: 3, reps: "12",      rest: "45s" },
        { name: "Chest Fly",         sets: 3, reps: "12",      rest: "45s" },
    ];
    if (name.includes("pull")) return [
        { name: "Pull Ups",          sets: 4, reps: "8",       rest: "60s" },
        { name: "Bent Over Row",     sets: 4, reps: "10",      rest: "60s" },
        { name: "Bicep Curls",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Face Pulls",        sets: 3, reps: "15",      rest: "45s" },
        { name: "Hammer Curls",      sets: 3, reps: "12",      rest: "45s" },
        { name: "Shrugs",            sets: 3, reps: "15",      rest: "45s" },
    ];
    if (name.includes("leg") || name.includes("lower")) return [
        { name: "Squats",            sets: 4, reps: "12",      rest: "60s" },
        { name: "Lunges",            sets: 3, reps: "10 each", rest: "45s" },
        { name: "Leg Press",         sets: 4, reps: "10",      rest: "60s" },
        { name: "Calf Raises",       sets: 4, reps: "15",      rest: "30s" },
        { name: "Hamstring Curls",   sets: 3, reps: "12",      rest: "45s" },
        { name: "Glute Bridges",     sets: 3, reps: "15",      rest: "45s" },
    ];
    if (name.includes("upper")) return [
        { name: "Push Ups",          sets: 4, reps: "12",      rest: "45s" },
        { name: "Pull Ups",          sets: 3, reps: "8",       rest: "60s" },
        { name: "Shoulder Press",    sets: 3, reps: "10",      rest: "60s" },
        { name: "Bent Over Row",     sets: 3, reps: "10",      rest: "60s" },
        { name: "Bicep Curls",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Tricep Dips",       sets: 3, reps: "12",      rest: "45s" },
    ];
    if (name.includes("cardio")) return [
        { name: "Jumping Jacks",     sets: 3, reps: "30 sec",  rest: "30s" },
        { name: "High Knees",        sets: 3, reps: "30 sec",  rest: "30s" },
        { name: "Burpees",           sets: 3, reps: "10",      rest: "45s" },
        { name: "Mountain Climbers", sets: 3, reps: "20",      rest: "30s" },
        { name: "Jump Rope",         sets: 3, reps: "1 min",   rest: "30s" },
    ];
    if (name.includes("full") || name.includes("body")) return [
        { name: "Push Ups",          sets: 3, reps: "12",      rest: "45s" },
        { name: "Squats",            sets: 3, reps: "12",      rest: "45s" },
        { name: "Bent Over Row",     sets: 3, reps: "10",      rest: "60s" },
        { name: "Lunges",            sets: 3, reps: "10 each", rest: "45s" },
        { name: "Plank",             sets: 3, reps: "45 sec",  rest: "30s" },
        { name: "Jumping Jacks",     sets: 3, reps: "30 sec",  rest: "30s" },
    ];
    if (name.includes("chest")) return [
        { name: "Push Ups",          sets: 4, reps: "15",      rest: "45s" },
        { name: "Dumbbell Press",    sets: 4, reps: "10",      rest: "60s" },
        { name: "Chest Fly",         sets: 3, reps: "12",      rest: "45s" },
        { name: "Incline Press",     sets: 3, reps: "10",      rest: "60s" },
        { name: "Tricep Dips",       sets: 3, reps: "10",      rest: "45s" },
    ];
    if (name.includes("back")) return [
        { name: "Pull Ups",          sets: 4, reps: "8",       rest: "60s" },
        { name: "Bent Over Row",     sets: 4, reps: "10",      rest: "60s" },
        { name: "Lat Pulldown",      sets: 3, reps: "12",      rest: "60s" },
        { name: "Face Pulls",        sets: 3, reps: "15",      rest: "45s" },
        { name: "Deadlift",          sets: 3, reps: "8",       rest: "90s" },
    ];
    if (name.includes("shoulder") || name.includes("delt")) return [
        { name: "Shoulder Press",    sets: 4, reps: "10",      rest: "60s" },
        { name: "Lateral Raises",    sets: 3, reps: "12",      rest: "45s" },
        { name: "Front Raises",      sets: 3, reps: "12",      rest: "45s" },
        { name: "Face Pulls",        sets: 3, reps: "15",      rest: "45s" },
        { name: "Upright Row",       sets: 3, reps: "12",      rest: "45s" },
    ];
    if (name.includes("arm") || name.includes("bicep") || name.includes("tricep")) return [
        { name: "Bicep Curls",         sets: 4, reps: "12",    rest: "45s" },
        { name: "Tricep Dips",         sets: 4, reps: "12",    rest: "45s" },
        { name: "Hammer Curls",        sets: 3, reps: "12",    rest: "45s" },
        { name: "Skull Crushers",      sets: 3, reps: "10",    rest: "45s" },
        { name: "Concentration Curls", sets: 3, reps: "12",    rest: "45s" },
    ];
    if (name.includes("hiit")) return [
        { name: "Burpees",           sets: 4, reps: "10",      rest: "20s" },
        { name: "Jump Squats",       sets: 4, reps: "15",      rest: "20s" },
        { name: "Mountain Climbers", sets: 4, reps: "20",      rest: "20s" },
        { name: "High Knees",        sets: 4, reps: "30 sec",  rest: "20s" },
        { name: "Box Jumps",         sets: 3, reps: "10",      rest: "30s" },
    ];
    if (name.includes("core") || name.includes("ab")) return [
        { name: "Plank",             sets: 4, reps: "45 sec",  rest: "30s" },
        { name: "Crunches",          sets: 3, reps: "20",      rest: "30s" },
        { name: "Leg Raises",        sets: 3, reps: "15",      rest: "30s" },
        { name: "Russian Twists",    sets: 3, reps: "20",      rest: "30s" },
        { name: "Mountain Climbers", sets: 3, reps: "20",      rest: "30s" },
    ];
    if (name.includes("glute") || name.includes("hip")) return [
        { name: "Glute Bridges",     sets: 4, reps: "15",      rest: "30s" },
        { name: "Hip Thrusts",       sets: 4, reps: "12",      rest: "45s" },
        { name: "Sumo Squats",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Donkey Kicks",      sets: 3, reps: "15 each", rest: "30s" },
        { name: "Fire Hydrants",     sets: 3, reps: "15 each", rest: "30s" },
    ];
    if (name.includes("rest")) return [];

    return [
        { name: "Warm Up Walk",      sets: 1, reps: "5 min",   rest: "0s"  },
        { name: "Bodyweight Squats", sets: 3, reps: "15",      rest: "45s" },
        { name: "Push Ups",          sets: 3, reps: "10",      rest: "45s" },
        { name: "Plank",             sets: 3, reps: "30 sec",  rest: "30s" },
    ];
}

/* Render exercise list */
function renderExercises() {
    const container = document.getElementById("exerciseList");
    if (!container) return;

    // show progress bar and set initial label e.g. "0 / 6 done"
    const progressWrap  = document.getElementById("progressWrap");
    const progressLabel = document.getElementById("progressLabel");
    if (progressWrap)  progressWrap.style.display  = "block";
    if (progressLabel) progressLabel.textContent   = `0 / ${exercises.length} done`;  // FIX 1

    container.innerHTML = exercises.map((ex, i) => `
        <div class="exercise-card" id="ex-${i}">
            <div class="exercise-info">
                <h4 class="exercise-name">${ex.name}</h4>
                <p class="exercise-meta">${ex.sets} sets · ${ex.reps} reps · Rest ${ex.rest}</p>
            </div>
            <button
                class="exercise-done-btn"
                id="btn-${i}"
                onclick="completeExercise(${i})"
            >
                Done
            </button>
        </div>
    `).join("");

    startTimer();
}

/* Timer */
function startTimer() {
    startTime = Date.now();
    const timerEl = document.getElementById("workoutTimer");

    timerInterval = setInterval(() => {
        if (!timerEl) return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins    = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs    = (elapsed % 60).toString().padStart(2, "0");
        timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

/* Complete single exercise */
function completeExercise(index) {
    const card = document.getElementById(`ex-${index}`);
    const btn  = document.getElementById(`btn-${index}`);

    if (!card || btn.dataset.done === "true") return;

    card.classList.add("completed");
    btn.textContent  = "✓";
    btn.dataset.done = "true";
    btn.disabled     = true;

    completedCount++;

    // FIX 2: update fill bar width AND the "X / Y done" label separately
    const progressFill  = document.getElementById("workoutProgress");
    const progressLabel = document.getElementById("progressLabel");
    const pct           = Math.round((completedCount / exercises.length) * 100);

    if (progressFill)  progressFill.style.width      = pct + "%";        // width only, no textContent
    if (progressLabel) progressLabel.textContent     = `${completedCount} / ${exercises.length} done`;

    if (completedCount >= exercises.length) {
        setTimeout(finishWorkout, 600);
    }
}

/* Finish workout */
async function finishWorkout() {
    clearInterval(timerInterval);

    const duration = Math.round((Date.now() - startTime) / 60000);
    const calories = estimateCalories(duration, currentProfile?.fitness_level);
    const params   = new URLSearchParams(window.location.search);
    const workout  = params.get("workout") || "Workout";

    const { error: sessionError } = await sb.from("sessions").insert({
        user_id:      currentUser.id,
        workout_name: workout,
        duration,
        calories,
        exercises:    exercises.map(ex => ({ ...ex, completed: true })),
        completed_at: new Date()
    });

    if (sessionError) console.error("Session save error:", sessionError.message);

    const { data: progress } = await sb
        .from("progress")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (progress) {
        const today     = new Date().toDateString();
        const lastDate  = progress.last_workout_date
            ? new Date(progress.last_workout_date).toDateString()
            : null;
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        let newStreak;
        if (lastDate === today) {
            newStreak = progress.streak;
        } else if (lastDate === yesterday) {
            newStreak = progress.streak + 1;
        } else {
            newStreak = 1;
        }

        const longestStreak = Math.max(newStreak, progress.longest_streak || 0);

        await sb.from("progress").update({
            total_sessions:    progress.total_sessions + 1,
            total_mins:        progress.total_mins + duration,
            total_calories:    progress.total_calories + calories,
            streak:            newStreak,
            longest_streak:    longestStreak,
            last_workout_date: new Date(),
            updated_at:        new Date()
        }).eq("user_id", currentUser.id);

        localStorage.setItem("bf_streak", newStreak);
    }

    localStorage.setItem("bf_last_workout_date", new Date().toDateString());

    showCompletionScreen(duration, calories);
}

/* Completion screen */
function showCompletionScreen(duration, calories) {
    const container = document.getElementById("workoutContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="completion-screen">
            <div class="completion-icon">🎉</div>
            <h2>Workout Complete!</h2>
            <p class="completion-sub">Great work. Every rep counts.</p>
            <div class="completion-stats">
                <div class="comp-stat">
                    <span class="comp-val">${duration}</span>
                    <span class="comp-label">Minutes</span>
                </div>
                <div class="comp-stat">
                    <span class="comp-val">${exercises.length}</span>
                    <span class="comp-label">Exercises</span>
                </div>
                <div class="comp-stat">
                    <span class="comp-val">${calories}</span>
                    <span class="comp-label">Calories</span>
                </div>
            </div>
            <div class="completion-actions">
                <a href="../../dashboard/index.html" class="btn">Back to Dashboard</a>
                <a href="../progress/index.html" class="btn btn-outline">View Progress</a>
            </div>
        </div>
    `;
}

/* Calorie estimator */
function estimateCalories(duration, level) {
    const rate = level === "advanced"     ? 9
               : level === "intermediate" ? 7
               : 5;
    return Math.round(duration * rate);
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
initWorkout();