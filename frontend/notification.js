/*  notifications.js  */

const NOTIF_KEY = "bf_notif_permission";

/* Request permission on dashboard load */
async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return scheduleWorkoutReminder();
    if (Notification.permission === "denied") return;

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
        localStorage.setItem(NOTIF_KEY, "granted");
        scheduleWorkoutReminder();
    }
}

/* Schedule a reminder if user hasn't worked out today */
function scheduleWorkoutReminder() {
    const lastWorkout = localStorage.getItem("bf_last_workout_date");
    const today       = new Date().toDateString();

    if (lastWorkout === today) return; // already worked out today

    const now     = new Date();
    const hour    = now.getHours();

    // only remind between 6am and 9pm
    if (hour < 6 || hour >= 21) return;

    // fire reminder after 3 seconds on dashboard load
    setTimeout(() => {
        fireNotification(
            "Time to move 💪",
            "You haven't logged a workout today. Even 15 minutes counts.",
            "../quick-suggestion/index.html"
        );
    }, 3000);
}

/* Fire a notification */
function fireNotification(title, body, url) {
    if (Notification.permission !== "granted") return;

    const notif = new Notification(title, {
        body,
        icon: "../assets/logo.png", // update to your logo path
        badge: "../assets/logo.png"
    });

    notif.onclick = () => {
        window.focus();
        window.location.href = url;
        notif.close();
    };
}

/* Update last workout date when session completes */
function markWorkoutDone() {
    localStorage.setItem("bf_last_workout_date", new Date().toDateString());
}

/* Run on dashboard */
requestNotificationPermission();