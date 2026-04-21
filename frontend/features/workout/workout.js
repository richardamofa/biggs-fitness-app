let user = JSON.parse(localStorage.getItem("user")) || {
  name: "Guest",
  plan: null,
  workoutsCompleted: 0,
  streak: 0
};

function loadWorkoutPage() {
  let planText = document.getElementById("planText");

  if (planText) {
    planText.innerText = user.plan ? user.plan : "No plan selected";
  }
}

function startWorkout() {
  console.log("Current Plan:", user.plan);
  
  let workoutArea = document.getElementById("workoutArea");

  let exercises = getWorkoutByPlan(user.plan);

  workoutArea.innerHTML = `
    <h2>🔥 Active Workout</h2>
    <div id="exerciseList"></div>
  `;

  let list = document.getElementById("exerciseList");

  exercises.forEach((ex, index) => {
    list.innerHTML += `
      <div class="card">
        <h3>${ex.name}</h3>
        <p>${ex.sets}</p>
        <button onclick="completeExercise(${index})">Done ✔</button>
      </div>
    `;
  });

  window.total = exercises.length;
  window.done = 0;
}

function getWorkoutByPlan(plan) {

  if (plan === "Fat Loss") {
    return [
      { name: "Jumping Jacks", sets: "3 x 30 sec" },
      { name: "Burpees", sets: "3 x 10" },
      { name: "Mountain Climbers", sets: "3 x 20" }
    ];
  }

  if (plan === "Muscle Gain") {
    return [
      { name: "Push-ups", sets: "4 x 12" },
      { name: "Dumbbell Press", sets: "4 x 10" },
      { name: "Squats", sets: "4 x 10" }
    ];
  }

  if (plan === "Fitness") {
    return [
      { name: "Plank", sets: "3 x 45 sec" },
      { name: "Squats", sets: "3 x 12" },
      { name: "Jogging", sets: "10 min" }
    ];
  }

  return [
    { name: "Walking", sets: "10 min warm-up" }
  ];
}

function completeExercise(index) {

  window.done++;

  user.workoutsCompleted++;
  user.streak++;

  localStorage.setItem("user", JSON.stringify(user));

  alert("Exercise Completed ✔");

  if (window.done >= window.total) {
    finishWorkout();
  }
}

function finishWorkout() {

  let workoutArea = document.getElementById("workoutArea");

  workoutArea.innerHTML = `
    <div class="card">
      <h2>🎉 Workout Complete!</h2>
      <p>Great job 🔥</p>
      <p>Total Workouts: ${user.workoutsCompleted}</p>
      <p>Streak: ${user.streak} days</p>
    </div>
  `;
}

function workoutsHTML() {  // ✅ FIXED NAME (added "s")

  let message = "";

  if (!user.plan) {
    message = "⚠️ Please select a plan first in My Plans";
  } else {
    message = "🔥 " + user.plan + " Workout Ready";
  }

  return `
    <div class="section">

      <h1>🏋️ Workouts</h1>

      <div class="card">
        <h3>Today’s Workout</h3>
        <p>${message}</p>

        ${user.plan ? 
          `<button onclick="startWorkout()">Start Workout</button>` 
          : ""}
      </div>

      <div id="workoutArea"></div>

    </div>
  `;
}

