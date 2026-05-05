/* ── Register service worker ── */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(reg => console.log("SW registered:", reg.scope))
            .catch(err => console.log("SW registration failed:", err));
    });
}
 
/* ── PWA install prompt ── */
let deferredPrompt = null;
 
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
 
    // show custom install banner after 10 seconds if not already installed
    setTimeout(() => {
        if (deferredPrompt) showInstallBanner();
    }, 10000);
});
 
function showInstallBanner() {
    // don't show if already dismissed this session
    if (sessionStorage.getItem("bf_install_dismissed")) return;
 
    const banner = document.getElementById("installBanner");
    if (banner) banner.style.display = "flex";
}
 
function installApp() {
    if (!deferredPrompt) return;
 
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
        if (choice.outcome === "accepted") {
            console.log("User installed Biggs Fitness");
        }
        deferredPrompt = null;
        dismissInstallBanner();
    });
}
 
function dismissInstallBanner() {
    const banner = document.getElementById("installBanner");
    if (banner) banner.style.display = "none";
    sessionStorage.setItem("bf_install_dismissed", "true");
}
 
/* hide install banner once app is installed */
window.addEventListener("appinstalled", () => {
    dismissInstallBanner();
    console.log("Biggs Fitness installed successfully");
});
 
/* ── Screen size notice ── */
function checkScreenSize() {
    const notice = document.getElementById("screenNotice");
    if (!notice) return;
 
    // show notice on screens under 768px wide
    if (window.innerWidth < 768) {
        // only show once per session
        if (!sessionStorage.getItem("bf_notice_dismissed")) {
            notice.style.display = "flex";
        }
    } else {
        notice.style.display = "none";
    }
}
 
function dismissScreenNotice() {
    const notice = document.getElementById("screenNotice");
    if (notice) notice.style.display = "none";
    sessionStorage.setItem("bf_notice_dismissed", "true");
}
 
window.addEventListener("resize", checkScreenSize);
checkScreenSize();
 