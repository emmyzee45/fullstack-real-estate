import prisma from "../lib/prisma.js";
import { paystackApi } from "../utils/paystack.js";

// 1. Initialize transaction
export const initializePayment = async (req, res) => {
  const { email, amount, postId } = req.body;

  try {
    const response = await paystackApi.post("/transaction/initialize", {
      email,
      amount: amount * 100, // Convert to kobo
      callback_url: "http://localhost:5173/payment-success", // Your frontend callback URL
      metadata: {
            userId: req.userId,
            postId: postId, 
        },
    });

    res.status(200).json({ authorization_url: response.data.data.authorization_url });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ message: "Failed to initialize payment" });
  }
};

// 2. Verify transaction
export const verifyPayment = async (req, res) => {
  const { reference } = req.query;

  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);

    const paymentData = response.data.data;

    // Save payment record
    const payment = await prisma.payment.create({
      data: {
        reference: paymentData.reference,
        amount: paymentData.amount,
        status: paymentData.status,
        channel: paymentData.channel,
        currency: paymentData.currency,
        paidAt: new Date(paymentData.paid_at),
        user: {
          connect: {
            id: paymentData.metadata?.userId, // Ensure userId is passed in metadata during init
          },
        },
        post: paymentData.metadata?.postId
          ? {
              connect: {
                id: paymentData.metadata.postId,
              },
            }
          : undefined,
      },
    });

    res.status(200).json({
      message: "Payment verified",
      status: paymentData.status,
      amount: paymentData.amount / 100,
      email: paymentData.customer.email,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};
// Get all or filtered payments
export const getAllPayments = async (req, res) => {
  const { userId, postId, status } = req.query;
  console.log(req.query)
  try {
    const payments = await prisma.payment.findMany({
      where: {
        ...(userId && { userId }),
        ...(postId && { postId }),
        ...(status && { status }),
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        post: {
          select: { id: true, title: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a specific payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        post: {
          select: { id: true, title: true, price: true },
        },
      },
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  const { status } = req.body;

  if (!['success', 'failed', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};