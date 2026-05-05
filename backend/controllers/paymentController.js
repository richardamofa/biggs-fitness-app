import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/* Plan map — matches your pricing tiers */
const PLAN_MAP = {
    starter: { name: "starter", months: 0   },
    pro:     { name: "pro",     months: 1   },
    elite:   { name: "elite",   months: 1   },
};

/*
    POST /api/payment/verify
    Body: { reference, user_id, plan }
    - Verifies transaction with Paystack
    - Updates profiles.plan + profiles.plan_expires_at in Supabase
*/
export async function verifyPayment(req, res) {
    const { reference, user_id, plan } = req.body;

    if (!reference || !user_id || !plan) {
        return res.status(400).json({ error: "Missing reference, user_id, or plan." });
    }

    if (!PLAN_MAP[plan]) {
        return res.status(400).json({ error: "Invalid plan." });
    }

    try {
        /* 1. Verify with Paystack */
        const paystackRes = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const paystackData = await paystackRes.json();

        if (!paystackData.status || paystackData.data?.status !== "success") {
            console.error("Paystack verification failed:", paystackData.message);
            return res.status(402).json({ error: "Payment verification failed. Transaction not successful." });
        }

        /* 2. Calculate plan expiry — 1 month from now */
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        /* 3. Update Supabase profile */
        const { error: dbError } = await supabase
            .from("profiles")
            .update({
                plan:            plan,
                plan_expires_at: expiresAt.toISOString(),
                updated_at:      new Date().toISOString()
            })
            .eq("user_id", user_id);

        if (dbError) {
            console.error("Supabase update error:", dbError.message);
            return res.status(500).json({ error: "Payment verified but profile update failed. Contact support." });
        }

        /* 4. Return success */
        return res.json({
            success:     true,
            plan:        plan,
            expires_at:  expiresAt.toISOString(),
            amount:      paystackData.data.amount / 100, // Paystack returns pesewas
            currency:    paystackData.data.currency
        });

    } catch (error) {
        console.error("verifyPayment error:", error.message);
        return res.status(500).json({ error: "Server error during payment verification." });
    }
}