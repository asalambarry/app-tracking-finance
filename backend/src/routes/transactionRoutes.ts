import express from 'express';
import { addTransaction, deleteTransaction, getFilteredTransactions, getTransactionById, getTransactions, updateTransaction } from '../controllers/transactionController';

const router = express.Router();

router.post('/add', addTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
// Route pour filtrer les transactions
router.get('/filtered', getFilteredTransactions);

export default router;