/*checkPlan.js — biggs fitness plan gating 
Load AFTER supabase.js on any feature page. */

// free access list — user IDs here
const FREE_ACCESS = [
    "f111610a-ee2d-4852-8fa5-9fb50640a54d"
];

async function getUserPlan() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return "starter";

    // bypass payment for these users
    if (FREE_ACCESS.includes(user.id)) return "elite";

    const { data: profile } = await sb
        .from("profiles")
        .select("plan, plan_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

    // check if plan is expired
    if (profile?.plan_expires_at) {
        const expired = new Date(profile.plan_expires_at) < new Date();
        if (expired) return "starter";
    }

    return profile?.plan || "starter";
}

/* Plan hierarchy */
const PLAN_RANK = { starter: 0, pro: 1, elite: 2 };

/* Feature rules
   Each key maps to the minimum plan required */
const FEATURE_GATES = {
    generate_plan:    "starter",   // starter: 1/month cap enforced separately
    quick_session:    "starter",   // starter: 3/month cap enforced separately
    coach_directory:  "pro",
    coach_booking:    "elite",
    nutrition:        "elite",
};

/*  Fetch current user plan from Supabase  */
async function getUserPlan() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { plan: "starter", expired: false, user: null };

    const { data: profile } = await sb
        .from("profiles")
        .select("plan, plan_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

    const plan      = profile?.plan || "starter";
    const expiresAt = profile?.plan_expires_at;
    const expired   = expiresAt ? new Date(expiresAt) < new Date() : false;

    // If plan has expired, treat as starter
    const activePlan = expired ? "starter" : plan;

    return { plan: activePlan, expired, user };
}

/*  Check if user can access a feature 
   Returns { allowed: bool, plan: string, required: string } */
async function canAccess(feature) {
    const required = FEATURE_GATES[feature];
    if (!required) return { allowed: true, plan: "starter", required: "starter" };

    const { plan } = await getUserPlan();
    const allowed  = PLAN_RANK[plan] >= PLAN_RANK[required];

    return { allowed, plan, required };
}

/*  Check monthly usage cap (starter limits) 
   Counts sessions or plans created this calendar month */
async function checkMonthlyLimit(userId, type) {
    const limits = { generate_plan: 1, quick_session: 3 };
    const limit  = limits[type];
    if (!limit) return { withinLimit: true, used: 0, limit: 0 };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (type === "generate_plan") {
        const { count } = await sb
            .from("plans")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", startOfMonth.toISOString());

        return { withinLimit: (count || 0) < limit, used: count || 0, limit };
    }

    if (type === "quick_session") {
        // quick sessions stored in sessions table with short duration (≤ 15 mins)
        const { count } = await sb
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("duration", 15)
            .gte("completed_at", startOfMonth.toISOString());

        return { withinLimit: (count || 0) < limit, used: count || 0, limit };
    }

    return { withinLimit: true, used: 0, limit: 0 };
}

/*  Show upgrade modal 
   Call this when a gated feature is blocked */
function showUpgradeModal(requiredPlan, featureLabel) {
    // Remove any existing modal
    const existing = document.getElementById("upgradeModal");
    if (existing) existing.remove();

    const planLabel  = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
    const price      = requiredPlan === "pro" ? "GH₵ 39/month" : "GH₵ 59/month";

    const perks = {
        pro: [
            "Unlimited AI plan generation",
            "Unlimited quick sessions",
            "Coach directory access",
            "Advanced progress insights"
        ],
        elite: [
            "Everything in Pro",
            "1-on-1 coach booking",
            "Personalized nutrition guidance",
            "Real-time trainer feedback"
        ]
    };

    const perkList = (perks[requiredPlan] || [])
        .map(p => `<li>✓ ${p}</li>`)
        .join("");

    const modal = document.createElement("div");
    modal.id    = "upgradeModal";
    modal.innerHTML = `
        <div class="upgrade-overlay" onclick="closeUpgradeModal()"></div>
        <div class="upgrade-modal">
            <button class="upgrade-close" onclick="closeUpgradeModal()">✕</button>
            <div class="upgrade-icon">🔒</div>
            <h3 class="upgrade-title">Unlock ${featureLabel}</h3>
            <p class="upgrade-subtitle">This feature requires the <strong>${planLabel}</strong> plan (${price})</p>
            <ul class="upgrade-perks">${perkList}</ul>
            <button class="btn btn-primary upgrade-cta" onclick="goToUpgrade('${requiredPlan}')">
                Upgrade to ${planLabel}
            </button>
            <button class="btn btn-outline upgrade-later" onclick="closeUpgradeModal()">
                Maybe Later
            </button>
        </div>
    `;

    // Inject styles if not already present
    if (!document.getElementById("upgradeModalStyles")) {
        const style = document.createElement("style");
        style.id    = "upgradeModalStyles";
        style.textContent = `
            .upgrade-overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.75);
                z-index: 9998;
                backdrop-filter: blur(4px);
            }
            .upgrade-modal {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: #111111;
                border: 1px solid rgba(255,44,44,0.3);
                border-radius: 1.6rem;
                padding: 3.2rem 2.8rem;
                width: min(44rem, 90vw);
                z-index: 9999;
                text-align: center;
                font-family: Poppins, sans-serif;
                color: #f0ede8;
            }
            .upgrade-close {
                position: absolute; top: 1.6rem; right: 1.6rem;
                background: none; border: none;
                color: #888; font-size: 1.6rem;
                cursor: pointer; line-height: 1;
            }
            .upgrade-icon { font-size: 3.6rem; margin-bottom: 1.2rem; }
            .upgrade-title {
                font-size: 2rem; font-weight: 700;
                margin-bottom: 0.8rem; color: #f0ede8;
            }
            .upgrade-subtitle {
                font-size: 1.4rem; color: #aaa;
                margin-bottom: 2rem; line-height: 1.5;
            }
            .upgrade-subtitle strong { color: #ff2c2c; }
            .upgrade-perks {
                list-style: none; padding: 0;
                text-align: left; margin-bottom: 2.4rem;
            }
            .upgrade-perks li {
                font-size: 1.3rem; padding: 0.6rem 0;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                color: #ccc;
            }
            .upgrade-perks li:last-child { border-bottom: none; }
            .upgrade-cta {
                width: 100%; margin-bottom: 1rem;
                font-size: 1.4rem; padding: 1.2rem;
            }
            .upgrade-later {
                width: 100%;
                font-size: 1.3rem; padding: 1rem;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);
}

function closeUpgradeModal() {
    const modal = document.getElementById("upgradeModal");
    if (modal) modal.remove();
}

function goToUpgrade(plan) {
    // Store intended plan so landing page can pick it up
    sessionStorage.setItem("bf_intended_plan",   plan);
    sessionStorage.setItem("bf_intended_amount", plan === "pro" ? "3900" : "5900");
    // Go to pricing section on landing page
    window.location.href = "../../landing/index.html#pricing";
}