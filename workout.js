// function toggleDay(dayNumber) {
//     const content = document.getElementById("day" + dayNumber);
  
//     if (content.style.display === "grid") {
//       content.style.display = "none";
//     } else {
//       content.style.display = "grid";
//     }
//   }

// Accordion behavior (only one open at a time)
function toggleDay(dayId) {
  const allDays = document.querySelectorAll(".content");

  allDays.forEach((day) => {
    if (day.id !== dayId) {
      day.style.display = "none";
    }
  });

  const current = document.getElementById(dayId);

  if (current.style.display === "grid") {
    current.style.display = "none";
  } else {
    current.style.display = "grid";
  }
}

// Save checkbox states
function saveData() {
  const checkboxes = document.querySelectorAll("input[type='checkbox']");
  let data = [];

  checkboxes.forEach((box) => {
    data.push(box.checked);
  });

  localStorage.setItem("workoutData", JSON.stringify(data));
}

// Load saved data
function loadData() {
  const data = JSON.parse(localStorage.getItem("workoutData"));

  if (data) {
    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach((box, index) => {
      box.checked = data[index];
    });
  }
}

// Reset a specific day
function resetDay(dayId) {
  const section = document.getElementById(dayId);
  const checkboxes = section.querySelectorAll("input[type='checkbox']");

  checkboxes.forEach((box) => box.checked = false);
  saveData();
}

// Load when page opens
window.onload = loadData;
