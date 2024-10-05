import express from 'express';
import { addTransaction, deleteTransaction, getTransactions, getTransactionById, updateTransaction } from '../controllers/transactionController';

const router = express.Router();

router.post('/add', addTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;