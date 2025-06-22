import express from 'express';
import { getAgentsCount, getCustomersCount, getDashboardStats, getPaymentAnalytics, getRecentTransactions, getRevenueStats, getTopAgents, getTransactionAnalytics, getTransactionsCount } from '../controllers/dashboard.controller.js';
const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/agents/count', getAgentsCount);
router.get('/customers/count', getCustomersCount);
router.get('/transactions/count', getTransactionsCount);
router.get('/revenue', getRevenueStats);
router.get('/transactions/recent', getRecentTransactions);
router.get('/agents/top', getTopAgents);
router.get('/analytics/transactions', getTransactionAnalytics);
router.get('/analytics/payments', getPaymentAnalytics);

export default router;
