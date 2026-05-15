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

/*  Coach data  */
const COACHES = [
    {
        id: 1,
        name: "Dwayne Ofori",
        title: "Strength & Conditioning Coach",
        bio: "6 years helping clients build serious strength from home or gym. Specialises in progressive overload and body recomposition.",
        tags: ["muscle gain", "beginner"],
        rating: 4.9,
        reviews: 84,
        price: "GH₵ 120",
        period: "/month",
        photo: "../../assets/coaches/coach2.png",
        whatsapp: "233200854407",
        email: "kwame@biggsfitness.com",
        phone: "+233 20 085 4407"
    },
    {
        id: 2,
        name: "King Nasir Congo Version",
        title: "Fat Loss & HIIT Specialist",
        bio: "Certified personal trainer focused on sustainable fat loss. Creates high-energy plans that fit into busy schedules.",
        tags: ["weight loss", "endurance"],
        rating: 4.8,
        reviews: 61,
        price: "GH₵ 100",
        period: "/month",
        photo: "../../assets/coaches/coach9.png",
        whatsapp: "233XXXXXXXXX",
        email: "ama@biggsfitness.com",
        phone: "+233 XX XXX XXXX"
    },
    {
        id: 3,
        name: "Kofi Mensah",
        title: "Endurance & Cardio Coach",
        bio: "Former marathon runner turned coach. Builds stamina, improves cardio performance and trains athletes for race day.",
        tags: ["endurance"],
        rating: 4.7,
        reviews: 45,
        price: "GH₵ 90",
        period: "/month",
        photo: "../../assets/coaches/coach3.png",
        whatsapp: "233XXXXXXXXX",
        email: "kofi@biggsfitness.com",
        phone: "+233 XX XXX XXXX"
    },
    {
        id: 4,
        name: "Abena Osei",
        title: "Beginner & Lifestyle Coach",
        bio: "Passionate about helping complete beginners build confidence, consistency and healthy habits that actually stick.",
        tags: ["beginner", "weight loss"],
        rating: 5.0,
        reviews: 38,
        price: "GH₵ 80",
        period: "/month",
        photo: "../../assets/coaches/coach5.png",
        whatsapp: "233XXXXXXXXX",
        email: "abena@biggsfitness.com",
        phone: "+233 XX XXX XXXX"
    },
    {
        id: 5,
        name: "Famous Diddy",
        title: "Muscle & Hypertrophy Coach",
        bio: "Bodybuilding competitor with 8 years of coaching. Writes detailed programs focused on muscle growth and aesthetics.",
        tags: ["muscle gain"],
        rating: 4.9,
        reviews: 72,
        price: "GH₵ 140",
        period: "/month",
        photo: "../../assets/coaches/coach8.png",
        whatsapp: "233XXXXXXXXX",
        email: "yaw@biggsfitness.com",
        phone: "+233 XX XXX XXXX"
    },
    {
        id: 6,
        name: "Efua Boateng",
        title: "Holistic Fitness & Wellness Coach",
        bio: "Combines strength training, mobility work and mindset coaching for a complete approach to health and wellbeing.",
        tags: ["beginner", "endurance"],
        rating: 4.8,
        reviews: 53,
        price: "GH₵ 110",
        period: "/month",
        photo: "../../assets/coaches/coach7.png",
        whatsapp: "233XXXXXXXXX",
        email: "efua@biggsfitness.com",
        phone: "+233 XX XXX XXXX"
    }
];

/* Initials fallback when photo fails to load */
function initialsAvatar(name) {
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    return `<span class="coach-initials">${initials}</span>`;
}

function coachImgHTML(coach) {
    return `
        <img
            src="${coach.photo}"
            alt="${coach.name}"
            onerror="this.style.display='none'; this.parentElement.innerHTML += '${initialsAvatar(coach.name).replace(/'/g, "\\'")}'"
        />
    `;
}

/*  Render coaches  */
function renderCoaches(coaches) {
    const grid = document.getElementById("coachesGrid");
    if (!grid) return;

    grid.innerHTML = coaches.map(c => `
        <div class="coach-card" data-tags="${c.tags.join(",")}" data-id="${c.id}">
            <div class="coach-img">
                ${coachImgHTML(c)}
            </div>
            <div class="coach-body">
                <div class="coach-top">
                    <div>
                        <h4 class="coach-name">${c.name}</h4>
                        <p class="coach-title">${c.title}</p>
                    </div>
                    <div class="coach-rating">
                        <i class="fa-solid fa-star"></i>
                        ${c.rating}
                        <span style="color:rgba(240,237,232,0.3);font-weight:400;">(${c.reviews})</span>
                    </div>
                </div>
                <p class="coach-bio">${c.bio}</p>
                <div class="coach-tags">
                    ${c.tags.map(t => `<span class="coach-tag">${t}</span>`).join("")}
                </div>
                <div class="coach-footer">
                    <div class="coach-price">
                        <strong>${c.price}</strong>${c.period}
                    </div>
                    <button class="coach-book-btn" onclick="openModal(${c.id})">
                        Book Session
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

/*  Filter coaches  */
function filterCoaches(tag, btn) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".coach-card").forEach(card => {
        const tags = card.dataset.tags;
        if (tag === "all" || tags.includes(tag)) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }
    });
}

/*  Open booking modal  */
function openModal(coachId) {
    const coach = COACHES.find(c => c.id === coachId);
    if (!coach) return;

    const infoEl = document.getElementById("modalCoachInfo");
    const btnsEl = document.getElementById("modalBtns");

    infoEl.innerHTML = `
        <div class="modal-coach-avatar">
            ${coachImgHTML(coach)}
        </div>
        <div>
            <p class="modal-coach-name">${coach.name}</p>
            <p class="modal-coach-title">${coach.title}</p>
        </div>
    `;

    btnsEl.innerHTML = `
        <a href="https://wa.me/${coach.whatsapp}?text=Hi%20${encodeURIComponent(coach.name)}%2C%20I%20found%20you%20on%20Biggs%20Fitness%20and%20I%27d%20like%20to%20book%20a%20coaching%20session."
           target="_blank" rel="noopener" class="modal-contact-btn">
            <div class="mc-icon whatsapp"><i class="fa-brands fa-whatsapp"></i></div>
            <div class="mc-text">
                <span>Message on WhatsApp</span>
                <p>Usually replies within an hour</p>
            </div>
        </a>
        <a href="mailto:${coach.email}?subject=Coaching%20Session%20Request&body=Hi%20${encodeURIComponent(coach.name)}%2C%20I%27d%20like%20to%20book%20a%20coaching%20session."
           class="modal-contact-btn">
            <div class="mc-icon email"><i class="fa-solid fa-envelope"></i></div>
            <div class="mc-text">
                <span>Send an Email</span>
                <p>${coach.email}</p>
            </div>
        </a>
        <a href="tel:${coach.phone}" class="modal-contact-btn">
            <div class="mc-icon call"><i class="fa-solid fa-phone"></i></div>
            <div class="mc-text">
                <span>Call Directly</span>
                <p>${coach.phone}</p>
            </div>
        </a>
    `;

    document.getElementById("modalOverlay").classList.add("open");
}

/*  Close modal  */
function closeModal() {
    document.getElementById("modalOverlay").classList.remove("open");
}

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
});

/*  Sidebar toggle  */
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

/*  Logout  */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await sb.auth.signOut();
        localStorage.removeItem("bf_user_name");
        window.location.href = "../../form/login/index.html";
    });
}

/*  Init  */
async function initCoaches() {
    const { allowed, plan } = await canAccess("coach_directory");

    if (!allowed) {
        showUpgradeModal("pro", "Coach Directory");
        const grid = document.getElementById("coachGrid");
        if (grid) grid.style.filter = "blur(6px) brightness(0.4)";
        return;
    }

    if (plan === "pro") {
        document.querySelectorAll(".book-btn").forEach(btn => {
            btn.textContent = "Elite Only";
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.onclick = (e) => {
                e.preventDefault();
                showUpgradeModal("elite", "1-on-1 Coach Booking");
            };
        });
    }

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "../../form/login/index.html";
        return;
    }

    renderCoaches(COACHES);
}

initCoaches();