/* admin.js — load on every admin page */
/* initializing supabase */

/* Your Supabase user ID — anyone NOT in this list gets kicked out */
const ADMIN_IDS = [
    "dc8dac26-975b-4861-b313-49ac1efc22f3" 
];

/* Auth guard */
async function checkAdmin() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user || !ADMIN_IDS.includes(user.id)) {
        window.location.href = "../form/login/index.html";
        return false;
    }

    // set avatar initials
    const name    = user.user_metadata?.full_name || user.email.split("@")[0];
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const el = document.getElementById("adminAvatar");
    if (el) el.textContent = initials;

    return true;
}

/* Logout */
const adminLogoutBtn = document.getElementById("adminLogout");
if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", async () => {
        await sb.auth.signOut();
        localStorage.removeItem("bf_user_name");
        window.location.href = "../form/login/index.html";
    });
}

/* Error logger — call this anywhere in your app to log errors */
function logError(message, source = "", type = "error", stack = "") {
    const logs = JSON.parse(localStorage.getItem("bf_admin_logs") || "[]");

    logs.unshift({
        id:      Date.now(),
        type,    // "error" | "warn" | "info"
        message: String(message),
        source:  String(source),
        stack:   String(stack),
        time:    new Date().toISOString()
    });

    // keep max 500 logs
    if (logs.length > 500) logs.splice(500);

    localStorage.setItem("bf_admin_logs", JSON.stringify(logs));
}

/* Auto-catch global JS errors and log them */
window.addEventListener("error", (e) => {
    logError(e.message, e.filename + ":" + e.lineno, "error", e.error?.stack || "");
});

window.addEventListener("unhandledrejection", (e) => {
    logError(
        e.reason?.message || String(e.reason),
        "unhandledrejection",
        "error",
        e.reason?.stack || ""
    );
});

/* Also log to Supabase error_logs table if it exists */

/* Run this SQL first to enable Supabase logging:
   create table if not exists error_logs (
       id uuid primary key default gen_random_uuid(),
       type text default 'error',
       message text,
       source text,
       stack text,
       user_id uuid,
       created_at timestamptz default now()
   );
   alter table error_logs enable row level security;
   create policy "admin_only" on error_logs for all using (auth.uid() is not null);
*/
async function logErrorToSupabase(message, source = "", type = "error", stack = "") {
    try {
        const { data: { user } } = await sb.auth.getUser();
        await sb.from("error_logs").insert({
            type, message, source, stack,
            user_id: user?.id || null
        });
    } catch { /* silent — don't cause more errors */ }
}