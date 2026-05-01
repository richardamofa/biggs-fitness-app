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

/* Initials helper */
function getInitials(name) {
    return name
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/* Init */
async function initPlans() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

    currentUser = user;

    // load profile for prefilling form
    const { data: profile } = await sb
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    currentProfile = profile;

    const cachedName = localStorage.getItem("bf_user_name");
    const fullName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        cachedName ||
        user.email.split("@")[0];

    localStorage.setItem("bf_user_name", fullName);

    // null-safe — plans page has no #userName element
    const nameEl = document.getElementById("userName");
    if (nameEl) nameEl.textContent = fullName;
    document.getElementById("topbarAvatar").textContent = getInitials(fullName);

    if (profile) {
        // prefill form with saved preferences
        const levelEl = document.getElementById("fitnessLevel");
        const goalEl  = document.getElementById("goal");
        const equipEl = document.getElementById("equipment");
        const daysEl  = document.getElementById("daysPerWeek");

        if (levelEl) levelEl.value = profile.fitness_level || "beginner";
        if (goalEl)  goalEl.value  = profile.goal          || "stay active";
        if (equipEl) equipEl.value = profile.equipment     || "none";
        if (daysEl)  daysEl.value  = profile.days_per_week || 4;
    }

    // load existing plan if any
    await loadSavedPlan(user.id);
}

/* Load saved plan from Supabase */
async function loadSavedPlan(userId) {
    const { data: planRow } = await sb
        .from("plans")
        .select("plan_data, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (planRow?.plan_data) {
        renderPlan(planRow.plan_data, planRow.created_at);
    }
}

/* Generate plan via backend */
async function generatePlan() {
    const fitness_level = document.getElementById("fitnessLevel")?.value;
    const goal          = document.getElementById("goal")?.value;
    const equipment     = document.getElementById("equipment")?.value;
    const days_per_week = parseInt(document.getElementById("daysPerWeek")?.value);
    const btn           = document.getElementById("generateBtn");

    if (!fitness_level || !goal || !equipment || !days_per_week) {
        showNotification("Please fill in all fields.", "error");
        return;
    }

    // update profile in Supabase with latest preferences
    await sb.from("profiles").update({
        fitness_level,
        goal,
        equipment,
        days_per_week,
        updated_at: new Date()
    }).eq("user_id", currentUser.id);

    // loading state
    btn.textContent = "Generating...";
    btn.disabled    = true;

    try {
        const res = await fetch("http://localhost:3000/api/ai/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fitness_level, goal, equipment, days_per_week })
        });

        const data = await res.json();

        if (!res.ok) {
            showNotification(data.error || "Failed to generate plan.", "error");
            return;
        }

        // save plan to Supabase
        await sb.from("plans").insert({
            user_id:   currentUser.id,
            plan_data: data.plan
        });

        renderPlan(data.plan, new Date().toISOString());
        showNotification("Plan generated and saved!", "success");

    } catch (err) {
        console.error("generatePlan error:", err);
        showNotification("Could not reach server. Is your backend running?", "error");
    } finally {
        btn.textContent = "Generate New Plan";
        btn.disabled    = false;
    }
}

/* Render plan to UI */
const PLAN_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderPlan(plan, createdAt) {
    const container = document.getElementById("planContainer");
    const empty     = document.getElementById("emptyState");

    if (!container) return;

    if (empty) empty.style.display = "none";

    const date = new Date(createdAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric"
    });

    container.innerHTML = `
        <div class="plan-header">...</div>
        <div class="plan-days">
            ${plan.days.map((d, i) => {
                const isRest = d.workout.toLowerCase().includes("rest");
                return `
                    <div class="plan-day-card ${isRest ? 'rest' : ''}">
                        <span class="plan-day-name">${PLAN_DAYS[i] || "Day " + (i + 1)}</span>
                        <span class="plan-day-workout">${d.workout}</span>
                        <span class="plan-day-meta">
                            ${isRest
                                ? "Recovery 🛌"
                                : `${d.exercises} exercises · ${d.duration} mins`}
                        </span>
                        ${!isRest
                            ? `<a href="../workout/index.html?day=${i}&workout=${encodeURIComponent(d.workout)}" class="btn plan-start-btn">Start</a>`
                            : `<span class="rest-tag">Rest</span>`}
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

/* Notification helper */
function showNotification(msg, type = "error") {
    const el = document.getElementById("planNotification");
    if (!el) return;
    el.textContent   = msg;
    el.className     = `plan-notification ${type}`;
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
initPlans();