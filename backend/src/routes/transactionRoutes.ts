import express, { Router } from 'express';
import {
    addTransaction,
    deleteTransaction,
    exportFinancialReport,
    generateFinancialReport,
    getFilteredTransactions,
    getTransactionById,
    getTransactions,
    updateTransaction
} from '../controllers/transactionController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Middleware d'authentification appliqué à toutes les routes
router.use(authMiddleware);

// Routes CRUD de base
router.post('/', addTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Routes de filtrage
router.get('/filtered', getFilteredTransactions);

// Routes de rapport financier
router.get('/report', generateFinancialReport);
router.get('/report/export', exportFinancialReport);

// Routes de tableau de bord (commentées car apparemment déplacées)
// router.get('/dashboard', getDashboardData);
// router.get('/dashboard/chart', getChartData);

export default router;