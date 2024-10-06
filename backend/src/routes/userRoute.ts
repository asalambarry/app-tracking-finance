import express, { Router } from 'express';
import { login, logout, register } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.post('/logout', authMiddleware, logout);

// Autres routes potentielles
// router.get('/profile', authMiddleware, getProfile);
// router.put('/profile', authMiddleware, updateProfile);

export default router;