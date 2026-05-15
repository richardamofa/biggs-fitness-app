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

/* Init */
async function initWorkout() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

    currentUser = user;

    // load profile for calorie estimation
    const { data: profile } = await sb
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    currentProfile = profile;

    // get workout name from URL params (passed from plans page)
    const params      = new URLSearchParams(window.location.search);
    const workoutName = params.get("workout") || "Today's Workout";
    const dayIndex    = params.get("day");

    const titleEl = document.getElementById("workoutTitle");
    if (titleEl) titleEl.textContent = workoutName;

    // load exercises from saved plan
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

    if (planRow?.plan_data?.days && dayIndex !== null) {
        const day = planRow.plan_data.days[parseInt(dayIndex)];
        if (day?.exercises_detail) {
            exercises = day.exercises_detail;
        } else {
            // plan exists but no detailed exercises — use defaults for this workout type
            exercises = getDefaultExercises(workoutName);
        }
    } else {
        exercises = getDefaultExercises(workoutName);
    }

    renderExercises();
}

/* Default exercises by workout type */
function getDefaultExercises(workoutName) {
    const name = workoutName?.toLowerCase() || "";

    if (name.includes("push")) return [
        { name: "Push Ups",          sets: 4, reps: "12",      rest: "45s" },
        { name: "Dumbbell Press",    sets: 4, reps: "10",      rest: "60s" },
        { name: "Shoulder Press",    sets: 3, reps: "10",      rest: "60s" },
        { name: "Tricep Dips",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Lateral Raises",    sets: 3, reps: "12",      rest: "45s" },
        { name: "Chest Fly",         sets: 3, reps: "12",      rest: "45s" }
    ];

    if (name.includes("pull")) return [
        { name: "Pull Ups",          sets: 4, reps: "8",       rest: "60s" },
        { name: "Bent Over Row",     sets: 4, reps: "10",      rest: "60s" },
        { name: "Bicep Curls",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Face Pulls",        sets: 3, reps: "15",      rest: "45s" },
        { name: "Hammer Curls",      sets: 3, reps: "12",      rest: "45s" },
        { name: "Shrugs",            sets: 3, reps: "15",      rest: "45s" }
    ];

    if (name.includes("leg") || name.includes("lower")) return [
        { name: "Squats",            sets: 4, reps: "12",      rest: "60s" },
        { name: "Lunges",            sets: 3, reps: "10 each", rest: "45s" },
        { name: "Leg Press",         sets: 4, reps: "10",      rest: "60s" },
        { name: "Calf Raises",       sets: 4, reps: "15",      rest: "30s" },
        { name: "Hamstring Curls",   sets: 3, reps: "12",      rest: "45s" },
        { name: "Glute Bridges",     sets: 3, reps: "15",      rest: "45s" }
    ];

    if (name.includes("upper")) return [
        { name: "Push Ups",          sets: 4, reps: "12",      rest: "45s" },
        { name: "Pull Ups",          sets: 3, reps: "8",       rest: "60s" },
        { name: "Shoulder Press",    sets: 3, reps: "10",      rest: "60s" },
        { name: "Bent Over Row",     sets: 3, reps: "10",      rest: "60s" },
        { name: "Bicep Curls",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Tricep Dips",       sets: 3, reps: "12",      rest: "45s" }
    ];

    if (name.includes("cardio")) return [
        { name: "Jumping Jacks",     sets: 3, reps: "30 sec",  rest: "30s" },
        { name: "High Knees",        sets: 3, reps: "30 sec",  rest: "30s" },
        { name: "Burpees",           sets: 3, reps: "10",      rest: "45s" },
        { name: "Mountain Climbers", sets: 3, reps: "20",      rest: "30s" },
        { name: "Jump Rope",         sets: 3, reps: "1 min",   rest: "30s" }
    ];

    if (name.includes("full") || name.includes("body")) return [
        { name: "Push Ups",          sets: 3, reps: "12",      rest: "45s" },
        { name: "Squats",            sets: 3, reps: "12",      rest: "45s" },
        { name: "Bent Over Row",     sets: 3, reps: "10",      rest: "60s" },
        { name: "Lunges",            sets: 3, reps: "10 each", rest: "45s" },
        { name: "Plank",             sets: 3, reps: "45 sec",  rest: "30s" },
        { name: "Jumping Jacks",     sets: 3, reps: "30 sec",  rest: "30s" }
    ];

    if (name.includes("chest")) return [
        { name: "Push Ups",          sets: 4, reps: "15",      rest: "45s" },
        { name: "Dumbbell Press",    sets: 4, reps: "10",      rest: "60s" },
        { name: "Chest Fly",         sets: 3, reps: "12",      rest: "45s" },
        { name: "Incline Press",     sets: 3, reps: "10",      rest: "60s" },
        { name: "Tricep Dips",       sets: 3, reps: "10",      rest: "45s" }
    ];

    if (name.includes("back")) return [
        { name: "Pull Ups",          sets: 4, reps: "8",       rest: "60s" },
        { name: "Bent Over Row",     sets: 4, reps: "10",      rest: "60s" },
        { name: "Lat Pulldown",      sets: 3, reps: "12",      rest: "60s" },
        { name: "Face Pulls",        sets: 3, reps: "15",      rest: "45s" },
        { name: "Deadlift",          sets: 3, reps: "8",       rest: "90s" }
    ];

    if (name.includes("shoulder") || name.includes("delt")) return [
        { name: "Shoulder Press",    sets: 4, reps: "10",      rest: "60s" },
        { name: "Lateral Raises",    sets: 3, reps: "12",      rest: "45s" },
        { name: "Front Raises",      sets: 3, reps: "12",      rest: "45s" },
        { name: "Face Pulls",        sets: 3, reps: "15",      rest: "45s" },
        { name: "Upright Row",       sets: 3, reps: "12",      rest: "45s" }
    ];

    if (name.includes("arm") || name.includes("bicep") || name.includes("tricep")) return [
        { name: "Bicep Curls",       sets: 4, reps: "12",      rest: "45s" },
        { name: "Tricep Dips",       sets: 4, reps: "12",      rest: "45s" },
        { name: "Hammer Curls",      sets: 3, reps: "12",      rest: "45s" },
        { name: "Skull Crushers",    sets: 3, reps: "10",      rest: "45s" },
        { name: "Concentration Curls", sets: 3, reps: "12",   rest: "45s" }
    ];

    if (name.includes("hiit")) return [
        { name: "Burpees",           sets: 4, reps: "10",      rest: "20s" },
        { name: "Jump Squats",       sets: 4, reps: "15",      rest: "20s" },
        { name: "Mountain Climbers", sets: 4, reps: "20",      rest: "20s" },
        { name: "High Knees",        sets: 4, reps: "30 sec",  rest: "20s" },
        { name: "Box Jumps",         sets: 3, reps: "10",      rest: "30s" }
    ];

    if (name.includes("core") || name.includes("ab")) return [
        { name: "Plank",             sets: 4, reps: "45 sec",  rest: "30s" },
        { name: "Crunches",          sets: 3, reps: "20",      rest: "30s" },
        { name: "Leg Raises",        sets: 3, reps: "15",      rest: "30s" },
        { name: "Russian Twists",    sets: 3, reps: "20",      rest: "30s" },
        { name: "Mountain Climbers", sets: 3, reps: "20",      rest: "30s" }
    ];

    if (name.includes("glute") || name.includes("hip")) return [
        { name: "Glute Bridges",     sets: 4, reps: "15",      rest: "30s" },
        { name: "Hip Thrusts",       sets: 4, reps: "12",      rest: "45s" },
        { name: "Sumo Squats",       sets: 3, reps: "12",      rest: "45s" },
        { name: "Donkey Kicks",      sets: 3, reps: "15 each", rest: "30s" },
        { name: "Fire Hydrants",     sets: 3, reps: "15 each", rest: "30s" }
    ];

    if (name.includes("rest")) return [];

    // fallback 
    return [
        { name: "Warm Up Walk",      sets: 1, reps: "5 min",   rest: "0s"  },
        { name: "Bodyweight Squats", sets: 3, reps: "15",      rest: "45s" },
        { name: "Push Ups",          sets: 3, reps: "10",      rest: "45s" },
        { name: "Plank",             sets: 3, reps: "30 sec",  rest: "30s" }
    ];
}

/* Render exercise list */
function renderExercises() {
    const container = document.getElementById("exerciseList");
    if (!container) return;

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

    // start timer when exercises render
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
    btn.textContent    = "✓";
    btn.dataset.done   = "true";
    btn.disabled       = true;

    completedCount++;

    // update progress bar
    const progress = document.getElementById("workoutProgress");
    if (progress) {
        const pct = Math.round((completedCount / exercises.length) * 100);
        progress.style.width    = pct + "%";
        progress.textContent    = pct + "%";
    }

    // check if all done
    if (completedCount >= exercises.length) {
        setTimeout(finishWorkout, 600);
    }
}

/* Finish workout */
async function finishWorkout() {
    clearInterval(timerInterval);

    const duration = Math.round((Date.now() - startTime) / 60000); // mins
    const calories = estimateCalories(duration, currentProfile?.fitness_level);
    const params   = new URLSearchParams(window.location.search);
    const workout  = params.get("workout") || "Workout";

    // save session to Supabase
    const { error: sessionError } = await sb.from("sessions").insert({
        user_id:      currentUser.id,
        workout_name: workout,
        duration,
        calories,
        exercises:    exercises.map(ex => ({ ...ex, completed: true })),
        completed_at: new Date()
    });

    if (sessionError) console.error("Session save error:", sessionError.message);

    // update progress totals
    const { data: progress } = await sb
        .from("progress")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (progress) {
        const today         = new Date().toDateString();
        const lastDate      = progress.last_workout_date
            ? new Date(progress.last_workout_date).toDateString()
            : null;
        const yesterday     = new Date(Date.now() - 86400000).toDateString();
        const newStreak     = lastDate === yesterday || lastDate === today
            ? progress.streak + 1
            : 1;
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

        // keep streak in localStorage for topbar display
        localStorage.setItem("bf_streak", newStreak);
    }

    // show completion screen
    showCompletionScreen(duration, calories);

    localStorage.setItem("bf_last_workout_date", new Date().toDateString());
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
    const rate = level === "advanced" ? 9
               : level === "intermediate" ? 7
               : 5; // beginner
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