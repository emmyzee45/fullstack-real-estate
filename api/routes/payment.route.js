import express from "express";
import { getAllPayments, getPaymentById, initializePayment, updatePaymentStatus, verifyPayment } from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/paystack/initialize", verifyToken, initializePayment);
router.patch('/:id/status', updatePaymentStatus);
router.get("/paystack/verify", verifyPayment);
router.get('/:id', getPaymentById);
router.get('/', getAllPayments);

export default router;
