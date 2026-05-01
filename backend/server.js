import "dotenv/config";

import express    from "express";
import cors       from "cors";
import dotenv     from "dotenv";
import aiRoutes   from "./routes/ai.js";
import contactRoutes from "./routes/contact.js";


const app  = express();
const PORT = process.env.PORT || 3000;

/* Middleware */
app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

/* Routes */
app.use("/api/ai",      aiRoutes);
app.use("/api/contact", contactRoutes);

/* Health check */
app.get("/", (req, res) => {
    res.json({ status: "Biggs Fitness API running!" });
});

/* Start */
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

console.log(process.env.GROQ_API_KEY);