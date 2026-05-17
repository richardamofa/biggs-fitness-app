/* relies on sb from supabase.js — load that first */

/* Show avatar instantly from cache */
(function () {
    const cached = localStorage.getItem("bf_user_name");
    if (cached) {
        const el = document.getElementById("topbarAvatar");
        if (el) el.textContent = cached
            .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    }
})();

/* State */
let allCoaches  = [];
let modalCoach  = null;

/* Init */
async function initCoaches() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

    const cachedName = localStorage.getItem("bf_user_name");
    const el = document.getElementById("topbarAvatar");
    if (el && cachedName) el.textContent = cachedName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    await loadCoaches();
}

/* Load coaches from Supabase */
async function loadCoaches() {
    const container = document.getElementById("coachesGrid");
    if (container) container.innerHTML = `<p class="coaches-loading">Loading coaches...</p>`;

    const { data, error } = await sb
        .from("coaches")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Failed to load coaches:", error.message);
        if (container) container.innerHTML = `<p class="coaches-error">Could not load coaches. Please try again.</p>`;
        return;
    }

    allCoaches = data || [];
    renderCoaches(allCoaches);
}

/* Render coach cards */
function renderCoaches(coaches) {
    const grid = document.getElementById("coachesGrid");
    if (!grid) return;

    if (!coaches.length) {
        grid.innerHTML = `<p class="coaches-empty">No coaches available right now.</p>`;
        return;
    }

    grid.innerHTML = coaches.map(c => `
        <div class="coach-card" data-tags="${(c.tags || []).join(",")}" data-id="${c.id}">
            <div class="coach-img">
                ${c.photo
                    ? `<img src="${c.photo}" alt="${c.name}" />`
                    : `<span>${c.emoji || "💪"}</span>`}
            </div>
            <div class="coach-body">
                <div class="coach-top">
                    <div>
                        <h4 class="coach-name">${c.name}</h4>
                        <p class="coach-title">${c.title || ""}</p>
                    </div>
                    <div class="coach-rating">
                        ⭐ ${c.rating || 5.0}
                        <span style="color:rgba(240,237,232,0.3);font-weight:400;">(${c.reviews || 0})</span>
                    </div>
                </div>
                <p class="coach-bio">${c.bio || ""}</p>
                <div class="coach-tags">
                    ${(c.tags || []).map(t => `<span class="coach-tag">${t}</span>`).join("")}
                </div>
                <div class="coach-footer">
                    <div class="coach-price">
                        <strong>${c.price || ""}</strong>${c.period || "/month"}
                    </div>
                    <button class="coach-book-btn" onclick="openModal('${c.id}')">
                        Book Session
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

/* Filter coaches by specialty */
function filterCoaches(tag, btn) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const cards = document.querySelectorAll(".coach-card");
    cards.forEach(card => {
        const tags = card.dataset.tags;
        if (tag === "all" || tags.includes(tag)) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }
    });
}

/* Open booking modal */
function openModal(coachId) {
    const coach = allCoaches.find(c => c.id === coachId);
    if (!coach) return;

    modalCoach = coach;

    const infoEl = document.getElementById("modalCoachInfo");
    const btnsEl = document.getElementById("modalBtns");

    infoEl.innerHTML = `
        <div class="modal-coach-avatar">
            ${coach.photo ? `<img src="${coach.photo}" alt="${coach.name}" />` : coach.emoji || "💪"}
        </div>
        <div>
            <p class="modal-coach-name">${coach.name}</p>
            <p class="modal-coach-title">${coach.title || ""}</p>
        </div>
    `;

    btnsEl.innerHTML = `
        ${coach.whatsapp ? `
        <a href="https://wa.me/${coach.whatsapp}?text=Hi%20${encodeURIComponent(coach.name)}%2C%20I%20found%20you%20on%20Biggs%20Fitness%20and%20I'd%20like%20to%20book%20a%20coaching%20session."
           target="_blank" rel="noopener" class="modal-contact-btn">
            <div class="mc-icon whatsapp"><i class="fa-brands fa-whatsapp"></i></div>
            <div class="mc-text">
                <span>Message on WhatsApp</span>
                <p>Usually replies within 1 hour</p>
            </div>
        </a>` : ""}

        ${coach.email ? `
        <a href="mailto:${coach.email}?subject=Coaching%20Session%20Request&body=Hi%20${encodeURIComponent(coach.name)}%2C%20I'd%20like%20to%20book%20a%20coaching%20session."
           class="modal-contact-btn">
            <div class="mc-icon email"><i class="fa-solid fa-envelope"></i></div>
            <div class="mc-text">
                <span>Send an Email</span>
                <p>${coach.email}</p>
            </div>
        </a>` : ""}

        ${coach.phone ? `
        <a href="tel:${coach.phone}" class="modal-contact-btn">
            <div class="mc-icon call"><i class="fa-solid fa-phone"></i></div>
            <div class="mc-text">
                <span>Call Directly</span>
                <p>${coach.phone}</p>
            </div>
        </a>` : ""}
    `;

    document.getElementById("modalOverlay").classList.add("open");
}

/* Close modal */
function closeModal() {
    document.getElementById("modalOverlay").classList.remove("open");
    modalCoach = null;
}

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
});

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
initCoaches();