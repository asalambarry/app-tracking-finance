import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import BlacklistedToken from '../models/BlacklistedToken';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400).json({ message: 'Tous les champs sont requis' });
            return;
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(400).json({ message: 'Nom d\'utilisateur ou email déjà utilisé' });
            return;
        }

        // Créer un nouvel utilisateur
        const newUser: IUser = new User({ username, email, password });
        await newUser.save();

        // Générer un token JWT
        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({ message: 'Utilisateur créé avec succès', token });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: 'Email et mot de passe sont requis' });
            return;
        }

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ message: 'Email ou mot de passe incorrect' });
            return;
        }

        // Vérifier le mot de passe
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(400).json({ message: 'Email ou mot de passe incorrect' });
            return;
        }

        // Générer un token JWT
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ message: 'Connexion réussie', token });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
};
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            await new BlacklistedToken({ token }).save();
        }
        res.status(200).json({ message: 'Déconnexion réussie' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({ message: 'Erreur lors de la déconnexion' });
    }
}