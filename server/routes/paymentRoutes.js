import express from "express";
import { createBilling, getSimulatedCheckoutPage, confirmSimulatedPayment, handleWebhook } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Protected Routes
router.post("/create-billing", protect, createBilling);

// Unprotected Routes (used by browser redirects and webhooks)
router.get("/simulated-checkout", getSimulatedCheckoutPage);
router.post("/confirm-simulated-payment", confirmSimulatedPayment);
router.post("/webhook", handleWebhook);

export default router;
