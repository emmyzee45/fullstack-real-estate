import prisma from "../lib/prisma.js";
const { Role, Property, Type } = prisma;

// Helper for today’s month and year
const getCurrentMonthRange = () => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getDashboardStats = async (req, res) => {
  try {
    const [totalAgents, totalCustomers, totalTransactions, totalRevenue, pendingTransactions, completedTransactions] =
      await Promise.all([
        prisma.user.count({ where: { role: 'agent' } }),
        prisma.user.count({ where: { role: 'customer' } }),
        prisma.payment.count(),
        prisma.payment.aggregate({ _sum: { amount: true } }),
        prisma.payment.count({ where: { status: 'pending' } }),
        prisma.payment.count({ where: { status: 'success' } }),
      ]);

    const monthlyRange = getCurrentMonthRange();

    const [monthlyRevenue, monthlyTransactions, recentTransactions, topPerformingAgents] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paidAt: { gte: monthlyRange.start, lte: monthlyRange.end },
          status: 'success',
        },
      }),
      prisma.payment.count({
        where: {
          createdAt: { gte: monthlyRange.start, lte: monthlyRange.end },
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: true, post: true },
      }),
      prisma.user.findMany({
        where: { role: 'agent' },
        take: 5,
        orderBy: { payments: { _count: 'desc' } },
        select: {
          id: true,
          username: true,
          email: true,
          payments: true,
        },
      }),
    ]);

    const [transactionsByType, transactionsByProperty] = await Promise.all([
      prisma.post.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.post.groupBy({
        by: ['property'],
        _count: true,
      }),
    ]);

    const payments = await prisma.payment.groupBy({
      by: ['status'],
      _count: true,
    });

    const paymentStats = {
      totalPayments: totalTransactions,
      successfulPayments: completedTransactions,
      pendingPayments: pendingTransactions,
      failedPayments: payments.find(p => p.status === 'failed')?._count || 0,
      totalCommission: Math.round((totalRevenue._sum.amount || 0) * 0.1), // example: 10% commission
    };

    res.json({
      totalAgents,
      totalCustomers,
      totalTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingTransactions,
      completedTransactions,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      monthlyTransactions,
      recentTransactions,
      topPerformingAgents,
      transactionsByType: {
        buy: transactionsByType.find(t => t.type === 'buy')?._count || 0,
        rent: transactionsByType.find(t => t.type === 'rent')?._count || 0,
      },
      transactionsByProperty: {
        apartment: transactionsByProperty.find(p => p.property === 'apartment')?._count || 0,
        house: transactionsByProperty.find(p => p.property === 'house')?._count || 0,
        condo: transactionsByProperty.find(p => p.property === 'condo')?._count || 0,
        land: transactionsByProperty.find(p => p.property === 'land')?._count || 0,
      },
      paymentStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAgentsCount = async (req, res) => {
  const count = await prisma.user.count({ where: { role: 'agent' } });
  res.json({ count });
};

export const getCustomersCount = async (req, res) => {
  const count = await prisma.user.count({ where: { role: 'customer' } });
  res.json({ count });
};

export const getTransactionsCount = async (req, res) => {
  const count = await prisma.payment.count();
  res.json({ count });
};

export const getRevenueStats = async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [total, monthly, yearly] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfYear } } }),
  ]);

  res.json({
    totalRevenue: total._sum.amount || 0,
    monthlyRevenue: monthly._sum.amount || 0,
    yearlyRevenue: yearly._sum.amount || 0,
    commission: Math.round((total._sum.amount || 0) * 0.1),
  });
};

export const getRecentTransactions = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const transactions = await prisma.payment.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { user: true, post: true },
  });

  res.json(transactions);
};

export const getTopAgents = async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const agents = await prisma.user.findMany({
    where: { role: 'agent' },
    take: limit,
    orderBy: { payments: { _count: 'desc' } },
    select: {
      id: true,
      username: true,
      email: true,
      payments: true,
    },
  });

  res.json(agents);
};

export const getTransactionAnalytics = async (req, res) => {
  const { period = 'month' } = req.query;

  const now = new Date();
  let groupBy = 'month';
  let startDate;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return res.status(400).json({ error: 'Invalid period' });
  }

  const transactions = await prisma.payment.findMany({
    where: { createdAt: { gte: startDate } },
    orderBy: { createdAt: 'asc' },
  });

  // Placeholder logic for chart data
  const labels = transactions.map(p => p.createdAt.toISOString().split('T')[0]);
  const data = transactions.map(p => 1);
  const revenue = transactions.map(p => p.amount);

  res.json({ labels, data, revenue });
};

export const getPaymentAnalytics = async (req, res) => {
  const payments = await prisma.payment.findMany();

  const total = payments.length;
  const successful = payments.filter(p => p.status === 'success');
  const successRate = total > 0 ? (successful.length / total) * 100 : 0;
  const avgAmount =
    successful.length > 0 ? successful.reduce((sum, p) => sum + p.amount, 0) / successful.length : 0;

  res.json({
    totalPayments: total,
    successRate: Math.round(successRate),
    averageAmount: Math.round(avgAmount),
    monthlyPayments: [], // Optional: group by month if needed
  });
};
