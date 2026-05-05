/* relies on sb from supabase.js — load that first */

/*  State  */
let currentStep  = 1;
const totalSteps = 4;

const answers = {
    fitness_level: null,
    goal:          null,
    equipment:     null,
    days_per_week: null
};

/*  Select option  */
function selectOption(el, key) {
    const screen = el.closest(".ob-screen");
    screen.querySelectorAll(".ob-option").forEach(o => o.classList.remove("selected"));
    el.classList.add("selected");
    answers[key] = el.dataset.value;
    document.getElementById("nextBtn").disabled = false;
}

/*  Next step  */
async function nextStep() {
    if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
    } else {
        await saveAndFinish();
    }
}

/*  Prev step  */
function prevStep() {
    if (currentStep > 1) goToStep(currentStep - 1);
}

/*  Navigate to step  */
function goToStep(step) {
    document.getElementById(`screen-${currentStep}`).classList.remove("active");
    document.getElementById(`step-${currentStep}`).classList.remove("active");
    document.getElementById(`step-${currentStep}`).classList.add("done");

    currentStep = step;

    document.getElementById(`screen-${currentStep}`).classList.add("active");
    document.getElementById(`step-${currentStep}`).classList.add("active");
    document.getElementById(`step-${currentStep}`).classList.remove("done");

    document.getElementById("backBtn").style.display = currentStep > 1 ? "block" : "none";

    const nextBtn = document.getElementById("nextBtn");
    nextBtn.textContent = currentStep === totalSteps ? "Let's Go 🔥" : "Continue →";

    // disable next until option selected on new screen
    const key = ["fitness_level", "goal", "equipment", "days_per_week"][currentStep - 1];
    nextBtn.disabled = !answers[key];
}

/*  Save profile + auto-generate plan + redirect  */
async function saveAndFinish() {
    const btn  = document.getElementById("nextBtn");
    const note = document.getElementById("obNote");

    btn.textContent = "Setting up your profile...";
    btn.disabled    = true;

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "../form/login/index.html";
        return;
    }

    // Step 1 — save profile preferences
    const { error: profileError } = await sb.from("profiles").update({
        fitness_level: answers.fitness_level,
        goal:          answers.goal,
        equipment:     answers.equipment,
        days_per_week: parseInt(answers.days_per_week),
        updated_at:    new Date()
    }).eq("user_id", user.id);

    if (profileError) {
        showNote("Something went wrong saving your profile. Please try again.");
        btn.textContent = "Let's Go 🔥";
        btn.disabled    = false;
        return;
    }

    // Step 2 — auto-generate first AI plan
    btn.textContent = "Building your first plan...";

    try {
        const res = await fetch("http://localhost:3000/api/ai/generate-plan", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                fitness_level: answers.fitness_level,
                goal:          answers.goal,
                equipment:     answers.equipment,
                days_per_week: parseInt(answers.days_per_week)
            })
        });

        const data = await res.json();

        if (res.ok && data.plan) {
            await sb.from("plans").insert({
                user_id:   user.id,
                plan_data: data.plan
            });
        }
        // if it fails we don't block — user can generate manually from plans page
    } catch (err) {
        console.log("Auto plan generation skipped — backend not reachable:", err.message);
    }

    // Step 3 — redirect to dashboard — plan is already waiting
    btn.textContent = "All set! Taking you in...";
    setTimeout(() => {
        window.location.href = "../dashboard/index.html";
    }, 800);
}

/*  Error helper  */
function showNote(msg) {
    const note = document.getElementById("obNote");
    if (!note) return;
    note.textContent   = msg;
    note.className     = "ob-note error";
    note.style.display = "block";
}

/*  Init — check session  */
async function initOnboarding() {
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        window.location.href = "../form/login/index.html";
        return;
    }

    // if profile already properly filled, skip onboarding
    const { data: profile } = await sb
        .from("profiles")
        .select("fitness_level, goal, equipment")
        .eq("user_id", user.id)
        .maybeSingle();

    // only skip if they've already gone through onboarding
    // "beginner" + "stay active" + "none" = default values = not onboarded yet
    const isDefault =
        !profile ||
        (profile.fitness_level === "beginner" &&
         profile.goal          === "stay active" &&
         profile.equipment     === "none");

    if (!isDefault) {
        window.location.href = "../dashboard/index.html";
    }
}

initOnboarding();