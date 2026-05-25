/* relies on sb from supabase.js — load that first */

/* Show avatar instantly from cache */
(function () {
    const cached = localStorage.getItem("bf_user_name");
    if (cached) {
        const el = document.getElementById("topbarAvatar");
        if (el) el.textContent = cached
            .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    }
})();

/* Helpers */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning 👋";
    if (h < 17) return "Good afternoon 👋";
    return "Good evening 👋";
}

function getInitials(name) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function isRestDay(workout) {
    return workout?.toLowerCase().includes("rest");
}

/* Default plan — Thu/Sat/Sun always rest */
const DEFAULT_PLAN = [
    { workout: "Push Day",  exercises: 6, duration: 45 }, // Mon
    { workout: "Pull Day",  exercises: 6, duration: 45 }, // Tue
    { workout: "Leg Day",   exercises: 6, duration: 45 }, // Wed
    { workout: "Rest",      exercises: 0, duration: 0  }, // Thu
    { workout: "Full Body", exercises: 6, duration: 45 }, // Fri
    { workout: "Rest",      exercises: 0, duration: 0  }, // Sat
    { workout: "Rest",      exercises: 0, duration: 0  }, // Sun
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* Render week strip */
function renderWeek(days) {
    const container = document.getElementById("weekDays");
    if (!container) return;

    const todayIdx = (new Date().getDay() + 6) % 7;

    container.innerHTML = days.map((d, i) => {
        const rest = isRestDay(d.workout);
        let tag, tagClass;

        if (i < todayIdx)       { tag = "Done";   tagClass = "tag-done"; }
        else if (i === todayIdx) { tag = "Today";  tagClass = "tag-today"; }
        else if (rest)           { tag = "Rest";   tagClass = "tag-rest"; }
        else                     { tag = "Coming"; tagClass = "tag-upcoming"; }

        return `
            <div class="week-day-row ${i === todayIdx ? "today" : ""} ${i < todayIdx ? "done" : ""}">
                <span class="day-name">${DAYS[i]}</span>
                <span class="day-workout">${d.workout}</span>
                <span class="day-tag ${tagClass}">${tag}</span>
            </div>
        `;
    }).join("");
}

/* Update today's banner */
function updateTodayBanner(days) {
    const todayIdx = (new Date().getDay() + 6) % 7;
    const todayDay = days[todayIdx];
    if (!todayDay) return;

    const rest = isRestDay(todayDay.workout);

    document.getElementById("todayTitle").textContent = todayDay.workout;
    document.getElementById("todayMeta").textContent  = rest
        ? "Take it easy today. Recovery matters."
        : `${todayDay.exercises || 6} exercises · ~${todayDay.duration || 45} mins`;

    const startBtn = document.getElementById("todayStartBtn");
    if (!startBtn) return;

    if (rest) {
        startBtn.textContent         = "Rest Day 🛌";
        startBtn.style.pointerEvents = "none";
        startBtn.style.opacity       = "0.4";
        startBtn.removeAttribute("href");
    } else {
        startBtn.textContent         = "Start Workout →";
        startBtn.style.pointerEvents = "";
        startBtn.style.opacity       = "";
        startBtn.href = `../features/workout/index.html?workout=${encodeURIComponent(todayDay.workout)}&day=${todayIdx}`;
    }
}

/* Handle new Google users */
async function checkNewGoogleUser(user) {
    const { data: profile } = await sb
        .from("profiles").select("id").eq("user_id", user.id).maybeSingle();

    if (!profile) {
        const name = user.user_metadata?.full_name || user.email.split("@")[0];
        await sb.from("profiles").insert({
            user_id:       user.id,
            full_name:     name,
            fitness_level: "beginner",
            goal:          "stay active",
            equipment:     "none",
            days_per_week: 4
        });
        await sb.from("progress").insert({
            user_id:        user.id,
            streak:         0,
            longest_streak: 0,
            total_sessions: 0,
            total_mins:     0,
            total_calories: 0
        });
        localStorage.setItem("bf_user_name", name);
        window.location.href = "../onboarding/index.html";
        return true; // FIX 1: signal that a redirect happened
    }
    return false;
}

/* Load dashboard */
async function loadDashboard() {
    document.getElementById("greeting").textContent = getGreeting();

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "../form/login/index.html";
        return;
    }

    // FIX 1: return early if checkNewGoogleUser redirected — stops
    // the rest of loadDashboard running while navigation is in flight
    const redirected = await checkNewGoogleUser(user);
    if (redirected) return;

    const ADMIN_IDS = ["01261b8b-00f2-4f60-b22e-965a6336b6ac"];
    if (ADMIN_IDS.includes(user.id)) {
        const adminNavItem = document.getElementById("adminNavItem");
        if (adminNavItem) adminNavItem.style.display = "flex";
    }

    const [profileRes, progressRes, planRes] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("progress").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("plans").select("plan_data").eq("user_id", user.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle()
    ]);

    const profile  = profileRes.data;
    const progress = progressRes.data;
    const planRow  = planRes.data;

    const cachedName = localStorage.getItem("bf_user_name");
    const fullName   = profile?.full_name || user.user_metadata?.full_name
        || cachedName || user.email.split("@")[0];

    localStorage.setItem("bf_user_name", fullName);
    document.getElementById("userName").textContent     = fullName;
    document.getElementById("topbarAvatar").textContent = getInitials(fullName);

    document.getElementById("streakCount").textContent = progress?.streak || 0;

    document.getElementById("statCalories").textContent = progress?.total_calories
        ? progress.total_calories.toLocaleString() + " kcal" : "0 kcal";

    document.getElementById("statMins").textContent = progress?.total_mins
        ? progress.total_mins + " mins" : "0 mins";

    const { data: sessions } = await sb
        .from("sessions").select("completed_at").eq("user_id", user.id);

    if (sessions && sessions.length > 0) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);
        const thisWeek = sessions.filter(s => new Date(s.completed_at) >= weekStart);
        const target   = profile?.days_per_week || 4;
        document.getElementById("statSessions").textContent = `${thisWeek.length} / ${target}`;
        document.getElementById("statGoals").textContent    =
            thisWeek.length >= Math.ceil(target / 2) ? "On Track ✓" : "Keep Going";
    } else {
        document.getElementById("statSessions").textContent = `0 / ${profile?.days_per_week || 4}`;
        document.getElementById("statGoals").textContent    = "Get Started";
    }

    const days = planRow?.plan_data?.days || DEFAULT_PLAN;
    renderWeek(days);
    updateTodayBanner(days);
}

/* Sidebar toggle — FIX 2: null guards so missing elements don't crash */
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

/* Logout — FIX 3: null guard */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await sb.auth.signOut();
        localStorage.removeItem("bf_user_name");
        window.location.href = "../form/login/index.html";
    });
}

/* Init */
loadDashboard();