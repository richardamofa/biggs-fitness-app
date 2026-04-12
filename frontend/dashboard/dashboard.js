const SUPABASE_URL = "https://ioyluedlmcfvayikudfd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Bm-mCRLQ6MBV_C-GMldd8A_QV0k70b1";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Greeting based on time */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning 👋";
    if (h < 17) return "Good afternoon 👋";
    return "Good evening 👋";
}

/* Render week days */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderWeek(plan) {
    const container = document.getElementById("weekDays");
    const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Mon

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
            tag = "Done"; tagClass = "tag-done";
        } else if (i === todayIdx) {
            tag = "Today"; tagClass = "tag-today";
        } else if (d.workout === "Rest") {
            tag = "Rest"; tagClass = "tag-rest";
        } else {
            tag = "Coming"; tagClass = "tag-upcoming";
        }

        const isToday = i === todayIdx ? "today" : "";
        const isDone  = i < todayIdx  ? "done"  : "";

        return `
            <div class="week-day-row ${isToday} ${isDone}">
                <span class="day-name">${DAYS[i]}</span>
                <span class="day-workout">${d.workout}</span>
                <span class="day-tag ${tagClass}">${tag}</span>
            </div>
        `;
    }).join("");
}

/* Load user data from Supabase */
async function loadDashboard() {
    document.getElementById("greeting").textContent = getGreeting();

    const { data: { user }, error } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../form/login/login.html";
        return;
    }

    // name from metadata or email fallback
    const fullName = user.user_metadata?.full_name || user.email.split("@")[0];
    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    document.getElementById("userName").textContent = fullName;
    document.getElementById("topbarAvatar").textContent = initials;

    // load stats from Supabase (sessions table)
    const { data: sessions } = await sb
        .from("sessions")
        .select("duration, calories, completed_at")
        .eq("user_id", user.id);

    if (sessions && sessions.length > 0) {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());

        const thisWeek = sessions.filter(s => new Date(s.completed_at) >= weekStart);

        const totalCals = sessions.reduce((a, s) => a + (s.calories || 0), 0);
        const totalMins = sessions.reduce((a, s) => a + (s.duration || 0), 0);

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

    // streak (stored in localStorage for now, move to DB later)
    const streak = localStorage.getItem("bf_streak") || 0;
    document.getElementById("streakCount").textContent = streak;

    // load saved plan from Supabase (plans table)
    const { data: planRow } = await sb
        .from("plans")
        .select("plan_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (planRow?.plan_data) {
        const plan = planRow.plan_data;
        renderWeek(plan.days || null);

        // today's session
        const todayIdx = (new Date().getDay() + 6) % 7;
        const todayDay = plan.days?.[todayIdx];
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
const sidebar  = document.getElementById("sidebar");
const overlay  = document.getElementById("sidebarOverlay");
const menuBtn  = document.getElementById("menuToggle");

function openSidebar()  {
    sidebar.classList.add("open");
    overlay.classList.add("open");
}
function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
}

menuBtn.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);

/* Logout */
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    window.location.href = "../form/login/index.html";
});

/* Initilization */
loadDashboard();