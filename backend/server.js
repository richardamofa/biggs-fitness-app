import "dotenv/config";

import cors from "cors";
import express from "express";
import aiRoutes from "./routes/ai.js";
import contactRoutes from "./routes/contact.js";
import paymentRoutes from "./routes/payment.js";

const app  = express();
const PORT = process.env.PORT || 3000;

/* Middleware */
app.use(cors({
    origin: function(origin, callback) {
        const allowed = [
            "http://127.0.0.1:5500",
            "http://localhost:8000",
            process.env.FRONTEND_URL
        ].filter(Boolean);

        // allow requests with no origin (mobile apps, Postman etc)
        if (!origin) return callback(null, true);

        if (allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods:      ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

/* Routes */
app.use("/api/ai",      aiRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);

/* Health check */
app.get("/", (req, res) => {
    res.json({ status: "Biggs Fitness API running!" });
});

/* Start */
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});