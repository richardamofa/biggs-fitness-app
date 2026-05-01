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
        { workout: "Rest" },
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
    await checkNewGoogleUser();
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

    // pull all data in parallel
    const [profileRes, progressRes, planRes] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("progress").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("plans").select("plan_data").eq("user_id", user.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle()
    ]);

    const profile  = profileRes.data;
    const progress = progressRes.data;
    const planRow  = planRes.data;

    // name
    const fullName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        cachedName ||
        user.email.split("@")[0];

    localStorage.setItem("bf_user_name", fullName);
    document.getElementById("userName").textContent     = fullName;
    document.getElementById("topbarAvatar").textContent = getInitials(fullName);

    // streak — from Supabase, not localStorage
    document.getElementById("streakCount").textContent = progress?.streak || 0;

    // stats — from progress table
    document.getElementById("statCalories").textContent =
        progress?.total_calories
            ? progress.total_calories.toLocaleString() + " kcal"
            : "0 kcal";

    document.getElementById("statMins").textContent =
        progress?.total_mins
            ? progress.total_mins + " mins"
            : "0 mins";

    // sessions this week — still from sessions table for accuracy
    const { data: sessions } = await sb
        .from("sessions")
        .select("completed_at")
        .eq("user_id", user.id);

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

    // weekly plan
    if (planRow?.plan_data) {
        const plan     = planRow.plan_data;
        const todayIdx = (new Date().getDay() + 6) % 7;
        const todayDay = plan.days?.[todayIdx];

        renderWeek(plan.days || null);

        if (todayDay) {
            const isRest = todayDay.workout?.toLowerCase().includes("rest");

            document.getElementById("todayTitle").textContent = todayDay.workout;
            document.getElementById("todayMeta").textContent  = isRest
                ? "Take it easy today. Recovery matters."
                : `${todayDay.exercises || 6} exercises · ~${todayDay.duration || 45} mins`;

            // disable start button on rest days
            const startBtn = document.getElementById("todayStartBtn");
            if (startBtn) {
                if (isRest) {
                    startBtn.textContent         = "Rest Day 🛌";
                    startBtn.style.pointerEvents = "none";
                    startBtn.style.opacity       = "0.4";
                    startBtn.removeAttribute("href");
                } else {
                    startBtn.href = `../workout/index.html?workout=${encodeURIComponent(todayDay.workout)}&day=${todayIdx}`;
                }
            }
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

/* Handle new Google sign-in users */
async function checkNewGoogleUser() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!profile) {
        const name = user.user_metadata?.full_name || user.email.split('@')[0];
        await sb.from('profiles').insert({
            user_id:       user.id,
            full_name:     name,
            fitness_level: 'beginner',
            goal:          'stay active',
            equipment:     'none',
            days_per_week: 4
        });
        await sb.from('progress').insert({
            user_id:        user.id,
            streak:         0,
            longest_streak: 0,
            total_sessions: 0,
            total_mins:     0,
            total_calories: 0
        });
        localStorage.setItem('bf_user_name', name);
    }
}

/* Init */
loadDashboard();