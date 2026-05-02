/* relies on sb from supabase.js — load that first */

/* Toast helper */
function showToast(msg, type = "error") {
    const toast = document.getElementById("toast");
    const label = document.getElementById("toastMsg");
    if (!toast || !label) return;
    label.textContent = msg;
    toast.className = "show " + type;
    setTimeout(() => { toast.className = ""; }, 3800);
}

/* Button loading state */
function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.original = btn.dataset.original || btn.innerHTML;
    btn.innerHTML = loading
        ? '<span class="spinner"></span>'
        : btn.dataset.original;
}

/* SIGN UP */
const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name     = document.getElementById("fullname")?.value.trim();
        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const agreed   = document.getElementById("agree")?.checked;
        const btn      = document.getElementById("signupBtn");

        if (!name)               return showToast("Please enter your full name.");
        if (!email)              return showToast("Please enter a valid email.");
        if (password.length < 8) return showToast("Password must be at least 8 characters.");
        if (!agreed)             return showToast("Please agree to the terms to continue.");

        setLoading(btn, true);

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            showToast(error.message);
            setLoading(btn, false);
            return;
        }

        const userId = data.user.id;

        // create profile row
        await sb.from("profiles").insert({
            user_id:       userId,
            full_name:     name,
            fitness_level: "beginner",
            goal:          "stay active",
            equipment:     "none",
            days_per_week: 4
        });

        // create progress row
        await sb.from("progress").insert({
            user_id:        userId,
            streak:         0,
            longest_streak: 0,
            total_sessions: 0,
            total_mins:     0,
            total_calories: 0
        });

        localStorage.setItem("bf_user_name", name);
        showToast("Account created! Setting up your profile...", "success");

        // go to onboarding — not dashboard
        setTimeout(() => {
            window.location.href = "../../onboarding/index.html";
        }, 1500);

        setLoading(btn, false);
    });
}

/* LOGIN */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const btn      = document.getElementById("loginBtn");

        if (!email)    return showToast("Please enter your email.");
        if (!password) return showToast("Please enter your password.");

        setLoading(btn, true);

        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
                showToast("Incorrect email or password. Please try again.");
            } else if (msg.includes("email not confirmed")) {
                showToast("Please confirm your email before logging in.");
            } else {
                showToast(error.message);
            }
            setLoading(btn, false);
            return;
        }

        const fullName =
            data.user?.user_metadata?.full_name ||
            email.split("@")[0];

        localStorage.setItem("bf_user_name", fullName);
        showToast("Welcome back!", "success");

        setTimeout(() => {
            window.location.href = "../../dashboard/index.html";
        }, 800);

        setLoading(btn, false);
    });
}

/* GOOGLE AUTH */
async function signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: 'http://127.0.0.1:5500/frontend/dashboard/index.html'
            // update this when you deploy to Netlify/Vercel
        }
    });
    if (error) showToast(error.message);
}

/* LOGOUT */
async function logout() {
    await sb.auth.signOut();
    localStorage.removeItem("bf_user_name");
    window.location.href = "../../form/login/index.html";
}