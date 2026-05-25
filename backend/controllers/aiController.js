import groq from "../modules/groq.js";

/* helpers */
function getEquipmentInstruction(equipment) {
    if (equipment === "none") {
        return `Equipment: NONE — use ONLY bodyweight exercises. Absolutely NO dumbbells, barbells, cables, machines, pull-up bars, resistance bands or any equipment whatsoever. Every single exercise must require zero equipment and can be done anywhere with no tools.`;
    }
    if (equipment === "basic") {
        return `Equipment: Basic home equipment only — dumbbells and resistance bands available. No gym machines, barbells or cables.`;
    }
    return `Equipment: Full gym access — all machines, barbells, dumbbells, cables and equipment available.`;
}

function getDifficultyInstruction(fitness_level) {
    if (fitness_level === "beginner") {
        return `Difficulty: BEGINNER — keep exercises simple and low intensity. Use lower reps (8-12), longer rest periods (60-90s), no complex movements. Focus on form and building a base.`;
    }
    if (fitness_level === "intermediate") {
        return `Difficulty: INTERMEDIATE — moderate intensity. Use 10-15 reps, moderate rest (45-60s), include some compound movements and supersets.`;
    }
    return `Difficulty: ADVANCED — high intensity. Use 12-20 reps, short rest (20-45s), include compound lifts, supersets, drop sets and challenging variations.`;
}

function getWorkoutDays(days_per_week) {
    const schedules = {
        3: ["Monday", "Wednesday", "Friday"],
        4: ["Monday", "Tuesday", "Wednesday", "Friday"],
        5: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    };
    return schedules[days_per_week] || schedules[4];
}

function buildDaySchedule(days_per_week) {
    const map = {
        3: [0, 2, 4],           // Mon, Wed, Fri
        4: [0, 1, 2, 4],        // Mon, Tue, Wed, Fri
        5: [0, 1, 2, 3, 4],     // Mon-Fri
        6: [0, 1, 2, 3, 4, 5],  // Mon-Sat
    };
    return map[days_per_week] || map[4];
}

/* Strip markdown code fences Groq sometimes wraps around JSON */
function stripFences(raw) {
    return raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
}

/* Generate weekly workout plan */
export async function generatePlan(req, res) {
    const { fitness_level, goal, equipment, days_per_week } = req.body;

    if (!fitness_level || !goal || !equipment || !days_per_week) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const workoutDayIdx = buildDaySchedule(parseInt(days_per_week));
    const DAY_NAMES     = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const daySchedule = DAY_NAMES.map((day, i) => {
        const isWorkout = workoutDayIdx.includes(i);
        return `- Day ${i + 1} - ${day} (index ${i}): ${isWorkout ? "WORKOUT DAY" : 'REST - must be { "workout": "Rest", "exercises": 0, "duration": 0 }'}`;
    }).join("\n");

    try {
        const completion = await groq.chat.completions.create({
            model:    "llama-3.3-70b-versatile",
            messages: [
                {
                    role:    "user",
                    content: `You are a professional fitness coach. Generate a ${days_per_week}-day weekly workout plan.

USER PROFILE:
- Fitness level: ${fitness_level}
- Goal: ${goal}
- ${getEquipmentInstruction(equipment)}
- ${getDifficultyInstruction(fitness_level)}

STRICT 7-DAY SCHEDULE (follow exactly):
${daySchedule}

IMPORTANT RULES:
1. ${equipment === "none" ? "NO equipment exercises at all — every exercise must be pure bodyweight only." : equipment === "basic" ? "Only use dumbbells and resistance bands — no gym machines." : "Full gym equipment allowed."}
2. Workout difficulty must match the ${fitness_level} level strictly.
3. Generate exactly ${days_per_week} workout days — no more, no less.
4. Rest days must be exactly: { "workout": "Rest", "exercises": 0, "duration": 0 }
5. Return ONLY valid JSON — no extra text, no markdown, no explanation, no code fences.

Return this exact JSON format:
{
  "days": [
    {
      "workout": "Push Day",
      "exercises": 6,
      "duration": 45
    }
  ]
}

The days array must have exactly 7 entries in Mon-Sun order.`
                }
            ],
            temperature: 0.5,
            max_tokens:  1024
        });

        const raw     = completion.choices[0].message.content.trim();
        const cleaned = stripFences(raw);
        const plan    = JSON.parse(cleaned);

        // enforce rest days server-side regardless of what AI returned
        const restDay        = { workout: "Rest", exercises: 0, duration: 0 };
        const allRestIndices = [0, 1, 2, 3, 4, 5, 6].filter(i => !workoutDayIdx.includes(i));
        allRestIndices.forEach(i => { plan.days[i] = restDay; });

        res.json({ plan });

    } catch (error) {
        console.error("generatePlan error:", error.message);
        res.status(500).json({ error: "Failed to generate plan. Please try again." });
    }
}

/* Quick session */
export async function quickSession(req, res) {
    const { fitness_level, equipment } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            model:    "llama-3.3-70b-versatile",
            messages: [
                {
                    role:    "user",
                    content: `You are a fitness coach. Generate a quick 10-15 minute workout session for someone who doesn't feel motivated today.

USER PROFILE:
- Fitness level: ${fitness_level || "beginner"}
- ${getEquipmentInstruction(equipment || "none")}
- ${getDifficultyInstruction(fitness_level || "beginner")}

RULES:
1. ${equipment === "none" || !equipment ? "NO equipment — pure bodyweight only." : equipment === "basic" ? "Dumbbells and bands only." : "Full gym equipment allowed."}
2. Keep it short (10-15 mins), simple and achievable — this is a motivation session.
3. Match difficulty to the ${fitness_level || "beginner"} level.
4. Return ONLY valid JSON — no extra text, no markdown, no code fences.

Return this exact format:
{
  "title": "Quick Burn",
  "duration": 12,
  "exercises": [
    {
      "name": "Jumping Jacks",
      "sets": 3,
      "reps": "20",
      "rest": "30s"
    }
  ]
}`
                }
            ],
            temperature: 0.6,
            max_tokens:  800
        });

        const raw     = completion.choices[0].message.content.trim();
        const cleaned = stripFences(raw);
        const session = JSON.parse(cleaned);

        res.json({ session });

    } catch (error) {
        console.error("quickSession error:", error.message);
        res.status(500).json({ error: "Failed to generate session. Please try again." });
    }
}