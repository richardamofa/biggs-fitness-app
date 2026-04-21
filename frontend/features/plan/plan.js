 // Load user or create default (FULL VERSION)
 let user = JSON.parse(localStorage.getItem("user")) || {
    name: "Guest",
    plan: null,
    workoutsCompleted: 0,
    streak: 0,
    level: "Beginner"
  };
  
  // Show current plan
  function updateUI() {
    const box = document.getElementById("currentPlan");
  
    if (!box) return; // prevent errors
  
    if (user.plan) {
      box.innerHTML = `🔥 Current Plan: <b>${user.plan}</b>`;
    } else {
      box.innerHTML = "No plan selected yet";
    }
  }
  
  // Run after page loads
  updateUI();
  
  // Select plan function
  function setPlan(planName) {
    console.log("Clicked plan:", planName); // DEBUG
  
    user.plan = planName;
  
    localStorage.setItem("user", JSON.stringify(user));
  
    alert("Plan set to: " + planName);
  
    updateUI(); // 🔥 UPDATE UI IMMEDIATELY
  }
  