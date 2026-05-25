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

/*Init*/
async function initProgress() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

        const ADMIN_IDS = ["01261b8b-00f2-4f60-b22e-965a6336b6ac"];
    if (ADMIN_IDS.includes(user.id)) {
        const adminNavItem = document.getElementById("adminNavItem");
        if (adminNavItem) adminNavItem.style.display = "flex";
    }

    // pull progress and sessions in parallel
    const [progressRes, sessionsRes] = await Promise.all([
        sb.from("progress").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("sessions").select("*").eq("user_id", user.id).order("completed_at", { ascending: false })
    ]);

    const progress = progressRes.data;
    const sessions = sessionsRes.data || [];

    renderStats(progress, sessions);
    renderSessionHistory(sessions);
}

/*Render stat cards*/
function renderStats(progress, sessions) {
    // streak
    setEl("statStreak",         progress?.streak            || 0);
    setEl("statLongestStreak",  progress?.longest_streak    || 0);
    setEl("statTotalSessions",  progress?.total_sessions    || 0);
    setEl("statTotalMins",      (progress?.total_mins       || 0) + " mins");
    setEl("statTotalCalories",  (progress?.total_calories   || 0).toLocaleString() + " kcal");

    // this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = sessions.filter(s => new Date(s.completed_at) >= weekStart);
    setEl("statThisWeek", thisWeek.length + " sessions");

    // most trained
    const workoutCounts = {};
    sessions.forEach(s => {
        const name = s.workout_name || "Unknown";
        workoutCounts[name] = (workoutCounts[name] || 0) + 1;
    });
    const mostTrained = Object.entries(workoutCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    setEl("statMostTrained", mostTrained);
}

/*Render session history*/
function renderSessionHistory(sessions) {
    const container = document.getElementById("sessionHistory");
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <p>No sessions yet. Complete your first workout to see history here.</p>
                <a href="../workout/index.html" class="btn">Start Workout</a>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.slice(0, 20).map(s => {
        const date = new Date(s.completed_at).toLocaleDateString("en-GB", {
            weekday: "short", day: "numeric", month: "short"
        });
        const time = new Date(s.completed_at).toLocaleTimeString("en-GB", {
            hour: "2-digit", minute: "2-digit"
        });

        return `
            <div class="history-card">
                <div class="history-left">
                    <h4 class="history-name">${s.workout_name || "Workout"}</h4>
                    <p class="history-date">${date} at ${time}</p>
                </div>
                <div class="history-right">
                    <span class="history-stat">
                        <i class="fa-solid fa-clock"></i> ${s.duration || 0} mins
                    </span>
                    <span class="history-stat">
                        <i class="fa-solid fa-fire"></i> ${s.calories || 0} kcal
                    </span>
                    <span class="history-stat">
                        <i class="fa-solid fa-dumbbell"></i>
                        ${s.exercises?.length || 0} exercises
                    </span>
                </div>
            </div>
        `;
    }).join("");
}

/*Helper*/
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/*Sidebar toggle*/
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
        // cache it for next time
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch {
        // backend down — try cache
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
}


/*Logout*/
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await sb.auth.signOut();
        localStorage.removeItem("bf_user_name");
        window.location.href = "../../form/login/index.html";
    });
}

/*Run*/
initProgress();