import groq from "../modules/groq.js";

/*  Generate weekly workout plan  */
export async function generatePlan(req, res) {
    const { fitness_level, goal, equipment, days_per_week } = req.body;

    if (!fitness_level || !goal || !equipment || !days_per_week) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: `You are a professional fitness coach. Generate a weekly workout plan for someone with the following profile:
- Fitness level: ${fitness_level}
- Goal: ${goal}
- Available equipment: ${equipment}

The plan MUST follow this exact 7-day schedule:
- Day 1 - Monday (index 0): workout day
- Day 2 - Tuesday (index 1): workout day  
- Day 3 - Wednesday (index 2): workout day
- Day 4 - Thursday (index 3): REST - must be { "workout": "Rest", "exercises": 0, "duration": 0 }
- Day 5 - Friday (index 4): workout day
- Day 6 - Saturday (index 5): REST - must be { "workout": "Rest", "exercises": 0, "duration": 0 }
- Day 7 - Sunday (index 6): REST - must be { "workout": "Rest", "exercises": 0, "duration": 0 }

Return ONLY a valid JSON object in this exact format, no extra text:
{
  "days": [
    {
      "workout": "Push Day",
      "exercises": 6,
      "duration": 45
    }
  ]
}

The days array must have exactly 7 entries in Mon–Sun order. Rest days must be { "workout": "Rest", "exercises": 0, "duration": 0 }.`
                }
            ],
            temperature: 0.7,
            max_tokens: 1024
        });

        const raw  = completion.choices[0].message.content.trim();
        const plan = JSON.parse(raw);

        // enforce rest days regardless of what AI returned
        const restDay = { workout: "Rest", exercises: 0, duration: 0 };
        plan.days[3] = restDay; // Thursday
        plan.days[5] = restDay; // Saturday
        plan.days[6] = restDay; // Sunday

        res.json({ plan });

    } catch (error) {
        console.error("generatePlan error:", error.message);
        res.status(500).json({ error: "Failed to generate plan. Please try again." });
    }
}

/*  Quick session  */
export async function quickSession(req, res) {
    const { fitness_level, equipment } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: `You are a fitness coach. Generate a quick 10-15 minute workout session for someone who doesn't feel motivated today.
- Fitness level: ${fitness_level || "beginner"}
- Equipment: ${equipment || "none"}

Keep it short, simple and achievable. Return ONLY a valid JSON object, no extra text:
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
            temperature: 0.7,
            max_tokens: 1024
        });

        const raw     = completion.choices[0].message.content.trim();
        const session = JSON.parse(raw);

        res.json({ session });

    } catch (error) {
        console.error("quickSession error:", error.message);
        res.status(500).json({ error: "Failed to generate session. Please try again." });
    }
}