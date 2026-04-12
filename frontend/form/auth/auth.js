//check if auth is working in console
//console.log("Auth JS running");

const SUPABASE_URL = "https://ioyluedlmcfvayikudfd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Bm-mCRLQ6MBV_C-GMldd8A_QV0k70b1";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

        if (!name)   return showToast("Please enter your full name.");
        if (!email)  return showToast("Please enter a valid email.");
        if (password.length < 8) return showToast("Password must be at least 8 characters.");
        if (!agreed) return showToast("Please agree to the terms to continue.");

        setLoading(btn, true);

        const { error } = await sb.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) {
            showToast(error.message);
        } else {
            showToast("Account created! Check your email to confirm.", "success");
            setTimeout(() => {
                window.location.href = "../../dashboard/dashboard.html";
            }, 2500);
        }

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

        const { error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            showToast(error.message);
        } else {
            showToast("Welcome back!", "success");
            setTimeout(() => {
                window.location.href = "../../dashboard/dashboard.html";
            }, 800);
        }

        setLoading(btn, false);
    });
}

/* LOGOUT */
async function logout() {
    await sb.auth.signOut();
    window.location.href = "../login/login.html";
}