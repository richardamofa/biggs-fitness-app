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


/* Init */
async function initProfile() {
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

    // load profile and progress in parallel
    const [profileRes, progressRes] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("progress").select("*").eq("user_id", user.id).maybeSingle()
    ]);

    const profile  = profileRes.data;
    const progress = progressRes.data;

    // fill in profile details
    const fullName = profile?.full_name || user.user_metadata?.full_name || user.email.split("@")[0];
    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    setEl("profileName",    fullName);
    setEl("profileEmail",   user.email);
    setEl("profileInitials",initials);

    // fill form fields
    setVal("p-name",        fullName);
    setVal("p-level",       profile?.fitness_level  || "beginner");
    setVal("p-goal",        profile?.goal           || "stay active");
    setVal("p-equipment",   profile?.equipment      || "none");
    setVal("p-days",        profile?.days_per_week  || 3);

    // stats
    setEl("profileSessions",  progress?.total_sessions  || 0);
    setEl("profileStreak",    progress?.streak           || 0);
    setEl("profileCalories",  (progress?.total_calories  || 0).toLocaleString());
    setEl("profileMins",      progress?.total_mins       || 0);

    // member since
    const joined = new Date(user.created_at).toLocaleDateString("en-GB", {
        month: "long", year: "numeric"
    });
    setEl("profileJoined", "Member since " + joined);
}

/* Save profile */
async function saveProfile() {
    const btn  = document.getElementById("saveProfileBtn");
    const note = document.getElementById("profileNote");

    const name       = document.getElementById("p-name")?.value.trim();
    const level      = document.getElementById("p-level")?.value;
    const goal       = document.getElementById("p-goal")?.value;
    const equipment  = document.getElementById("p-equipment")?.value;
    const days       = parseInt(document.getElementById("p-days")?.value);

    if (!name) {
        showNote("Please enter your name.", "error");
        return;
    }

    btn.textContent = "Saving...";
    btn.disabled    = true;

    const { data: { user } } = await sb.auth.getUser();

    const { error } = await sb.from("profiles").update({
        full_name:    name,
        fitness_level: level,
        goal,
        equipment,
        days_per_week: days,
        updated_at:   new Date()
    }).eq("user_id", user.id);

    if (error) {
        showNote("Failed to save. Please try again.", "error");
    } else {
        localStorage.setItem("bf_user_name", name);
        setEl("profileName", name);
        showNote("Profile updated successfully.", "success");
    }

    btn.textContent = "Save Changes";
    btn.disabled    = false;
}

/* Change password */
async function changePassword() {
    const current = document.getElementById("p-current-password")?.value;
    const newPw   = document.getElementById("p-new-password")?.value;
    const btn     = document.getElementById("changePasswordBtn");

    if (!current || !newPw) {
        showNote("Please fill in both password fields.", "error");
        return;
    }
    if (newPw.length < 8) {
        showNote("New password must be at least 8 characters.", "error");
        return;
    }

    btn.textContent = "Updating...";
    btn.disabled    = true;

    const { error } = await sb.auth.updateUser({ password: newPw });

    if (error) {
        showNote(error.message, "error");
    } else {
        showNote("Password updated successfully.", "success");
        document.getElementById("p-current-password").value = "";
        document.getElementById("p-new-password").value     = "";
    }

    btn.textContent = "Update Password";
    btn.disabled    = false;
}

/* Helpers */
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function showNote(msg, type = "error") {
    const el = document.getElementById("profileNote");
    if (!el) return;
    el.textContent   = msg;
    el.className     = `profile-note ${type}`;
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
initProfile();
