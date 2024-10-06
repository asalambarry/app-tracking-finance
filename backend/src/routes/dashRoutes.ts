import express, { Router } from 'express';
import {
    getDashboardData,
    getChartData,
    getCategoryChartData,
    getMonthlyBalance,
    getTopCategories,
    getRecentTransactions,
    getCategoryDistribution,
    getYearlyComparison,
    getCategoryTrends,
    compareCategoryPeriods,
    getTransactionDetails,
    getTransactionStats
} from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

// Regrouper les routes par fonctionnalité
// Routes principales du tableau de bord
router.get('/data', getDashboardData);
router.get('/chart', getChartData);

// Routes liées aux catégories
router.get('/category-chart', getCategoryChartData);
router.get('/category-distribution', getCategoryDistribution);
router.get('/category-trends', getCategoryTrends);
router.get('/category-period-comparison', compareCategoryPeriods);
router.get('/top-categories', getTopCategories);

// Routes liées aux transactions
router.get('/recent-transactions', getRecentTransactions);
router.get('/transaction/:transactionId', getTransactionDetails);
router.get('/transaction-stats', getTransactionStats);

// Routes d'analyse financière
router.get('/monthly-balance', getMonthlyBalance);
router.get('/yearly-comparison', getYearlyComparison);

export default router;