import { createClient } from "@supabase/supabase-js";

/* Save contact message */
export async function saveContact(req, res) {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email and message are required." });
    }

    // create client inside function so dotenv has already run
    const sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await sb.from("contacts").insert({
        name, email, subject, message
    });

    if (error) {
        console.error("saveContact error:", error.message);
        return res.status(500).json({ error: "Failed to save message. Please try again." });
    }

    res.json({ success: true, message: "Message received! We'll get back to you within 24 hours." });
}