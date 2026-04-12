// function toggleDay(dayNumber) {
//     const content = document.getElementById("day" + dayNumber);
  
//     if (content.style.display === "grid") {
//       content.style.display = "none";
//     } else {
//       content.style.display = "grid";
//     }
//   }

// hamburger
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
const menuLinks  = document.querySelectorAll('.mobile-menu a');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  document.body.style.overflow = 
    mobileMenu.classList.contains('active') ? 'hidden' : '';
});

// close when a link is clicked
menuLinks.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
  });
});

// close when clicking outside the menu
document.addEventListener('click', (e) => {
  if (
    mobileMenu.classList.contains('active') &&
    !mobileMenu.contains(e.target) &&
    !hamburger.contains(e.target)
  ) {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// testimonials 
const track  = document.getElementById('track');
const cards  = track.querySelectorAll('.t-card');
const dots   = document.querySelectorAll('.dot');
let current  = 0;
const gap    = 24;

function cardW() { return cards[0].offsetWidth + gap; }

function goTo(i) {
  current = (i + cards.length) % cards.length;
  track.style.transform = `translateX(-${current * cardW()}px)`;
  cards.forEach((c, idx) => c.classList.toggle('active', idx === current));
  dots.forEach((d, idx)  => d.classList.toggle('active', idx === current));
}

document.getElementById('prev').onclick = () => goTo(current - 1);
document.getElementById('next').onclick = () => goTo(current + 1);
dots.forEach(d => d.onclick = () => goTo(+d.dataset.i));

// touch swipe support
let startX = 0;
track.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
track.addEventListener('touchend',   e => {
  const diff = startX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
}, { passive: true });


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
