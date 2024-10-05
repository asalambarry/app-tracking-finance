import express from 'express';
import * as transactionController from '../controllers/transactionController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Routes transaction (toutes protégées par authMiddleware)
router.post('/', authMiddleware, transactionController.addTransaction);
router.get('/', authMiddleware, transactionController.getTransactions);
router.get('/filtered', authMiddleware, transactionController.getFilteredTransactions);
router.get('/:id', authMiddleware, transactionController.getTransactionById);
router.put('/:id', authMiddleware, transactionController.updateTransaction);
router.delete('/:id', authMiddleware, transactionController.deleteTransaction);

// Routes tableau de bord
router.get('/dashboard', authMiddleware, transactionController.getDashboardData);
router.get('/dashboard/chart', authMiddleware, transactionController.getChartData);

// Routes rapport financier
router.get('/report', authMiddleware, transactionController.generateFinancialReport);
router.get('/report/export', authMiddleware, transactionController.exportFinancialReport);

export default router;