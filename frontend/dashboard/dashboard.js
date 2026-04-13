/* relies on sb from supabase.js — load that first */

/* Greeting based on time */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning 👋";
    if (h < 17) return "Good afternoon 👋";
    return "Good evening 👋";
}

/* Initials from name */
function getInitials(name) {
    return name
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/* Render week days */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderWeek(plan) {
    const container = document.getElementById("weekDays");
    const todayIdx  = (new Date().getDay() + 6) % 7;

    const defaultPlan = [
        { workout: "Push Day" },
        { workout: "Pull Day" },
        { workout: "Leg Day" },
        { workout: "Rest" },
        { workout: "Full Body" },
        { workout: "Cardio" },
        { workout: "Rest" },
    ];

    const days = plan || defaultPlan;

    container.innerHTML = days.map((d, i) => {
        let tag, tagClass;
        if (i < todayIdx) {
            tag = "Done";   tagClass = "tag-done";
        } else if (i === todayIdx) {
            tag = "Today";  tagClass = "tag-today";
        } else if (d.workout === "Rest") {
            tag = "Rest";   tagClass = "tag-rest";
        } else {
            tag = "Coming"; tagClass = "tag-upcoming";
        }

        const isToday = i === todayIdx ? "today" : "";
        const isDone  = i < todayIdx   ? "done"  : "";

        return `
            <div class="week-day-row ${isToday} ${isDone}">
                <span class="day-name">${DAYS[i]}</span>
                <span class="day-workout">${d.workout}</span>
                <span class="day-tag ${tagClass}">${tag}</span>
            </div>
        `;
    }).join("");
}

/* Load dashboard */
async function loadDashboard() {
    document.getElementById("greeting").textContent = getGreeting();

    // show cached name instantly — no "Loading..." flash
    const cachedName = localStorage.getItem("bf_user_name");
    if (cachedName) {
        document.getElementById("userName").textContent     = cachedName;
        document.getElementById("topbarAvatar").textContent = getInitials(cachedName);
    }

    // verify session
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "../form/login/index.html";
        return;
    }

    // update name from Supabase and keep localStorage in sync
    const fullName =
        user.user_metadata?.full_name ||
        cachedName ||
        user.email.split("@")[0];

    localStorage.setItem("bf_user_name", fullName);
    document.getElementById("userName").textContent     = fullName;
    document.getElementById("topbarAvatar").textContent = getInitials(fullName);

    // streak
    const streak = localStorage.getItem("bf_streak") || 0;
    document.getElementById("streakCount").textContent = streak;

    // stats from sessions table
    const { data: sessions } = await sb
        .from("sessions")
        .select("duration, calories, completed_at")
        .eq("user_id", user.id);

    if (sessions && sessions.length > 0) {
        const now       = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);

        const thisWeek  = sessions.filter(s => new Date(s.completed_at) >= weekStart);
        const totalCals = sessions.reduce((a, s) => a + (s.calories || 0), 0);
        const totalMins = sessions.reduce((a, s) => a + (s.duration  || 0), 0);

        document.getElementById("statCalories").textContent = totalCals.toLocaleString() + " kcal";
        document.getElementById("statSessions").textContent = thisWeek.length + " / 5";
        document.getElementById("statMins").textContent     = totalMins + " mins";
        document.getElementById("statGoals").textContent    = thisWeek.length >= 3 ? "On Track ✓" : "Keep Going";
    } else {
        document.getElementById("statCalories").textContent = "0 kcal";
        document.getElementById("statSessions").textContent = "0 / 5";
        document.getElementById("statMins").textContent     = "0 mins";
        document.getElementById("statGoals").textContent    = "Get Started";
    }

    // load plan
    const { data: planRow } = await sb
        .from("plans")
        .select("plan_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (planRow?.plan_data) {
        const plan     = planRow.plan_data;
        const todayIdx = (new Date().getDay() + 6) % 7;
        const todayDay = plan.days?.[todayIdx];

        renderWeek(plan.days || null);

        if (todayDay) {
            document.getElementById("todayTitle").textContent = todayDay.workout;
            document.getElementById("todayMeta").textContent  =
                `${todayDay.exercises || 6} exercises · ~${todayDay.duration || 45} mins`;
        }
    } else {
        renderWeek(null);
    }
}

/* Sidebar toggle (mobile) */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
const menuBtn = document.getElementById("menuToggle");

menuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("open");
});
overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
});

/* Logout */
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    localStorage.removeItem("bf_user_name");
    window.location.href = "../form/login/index.html";
});

/* Init */
loadDashboard();