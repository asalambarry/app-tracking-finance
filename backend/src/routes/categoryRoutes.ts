import express, { Router } from 'express';
import {
    validateCategory,
    addCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

// Routes CRUD pour les catégories
router.route('/')
    .post(validateCategory, addCategory)
    .get(getCategories);

router.route('/:id')
    .get(getCategoryById)
    .put(validateCategory, updateCategory)
    .delete(deleteCategory);

export default router;