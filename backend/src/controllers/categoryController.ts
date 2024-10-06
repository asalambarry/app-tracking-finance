import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Category, { ICategory } from '../models/Category';

interface AuthRequest extends Request {
    userId?: string;
}

export const validateCategory = [
    body('name')
        .trim()
        .notEmpty().withMessage('Le nom de la catégorie est requis')
        .isLength({ min: 2, max: 50 }).withMessage('Le nom de la catégorie doit contenir entre 2 et 50 caractères'),
    body('type')
        .trim()
        .notEmpty().withMessage('Le type de catégorie est requis')
        .isIn(['revenu', 'dépense']).withMessage('Le type doit être "revenu" ou "dépense"')
];

export const addCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { name, type } = req.body;
        const userId = req.userId;

        const existingCategory = await Category.findOne({ name, user: userId });
        if (existingCategory) {
            res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà' });
            return;
        }

        const newCategory: ICategory = new Category({
            name,
            type,
            user: userId
        });

        await newCategory.save();

        res.status(201).json({ message: 'Catégorie ajoutée avec succès', category: newCategory });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la catégorie:', error);
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la catégorie' });
    }
};

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const categories = await Category.find({ user: userId });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
    }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { id } = req.params;
        const { name, type } = req.body;
        const userId = req.userId;

        const existingCategory = await Category.findOne({ _id: id, user: userId });
        if (!existingCategory) {
            res.status(404).json({ message: 'Catégorie non trouvée' });
            return;
        }

        if (name && name !== existingCategory.name) {
            const duplicateCategory = await Category.findOne({ name, user: userId, _id: { $ne: id } });
            if (duplicateCategory) {
                res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà' });
                return;
            }
        }

        const updatedCategory = await Category.findOneAndUpdate(
            { _id: id, user: userId },
            { name, type },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            res.status(404).json({ message: 'Catégorie non trouvée' });
            return;
        }

        res.status(200).json({ message: 'Catégorie mise à jour avec succès', category: updatedCategory });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la catégorie:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la catégorie' });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!id) {
            res.status(400).json({ message: 'ID de catégorie non fourni' });
            return;
        }

        const deletedCategory = await Category.findOneAndDelete({ _id: id, user: userId });

        if (!deletedCategory) {
            res.status(404).json({ message: 'Catégorie non trouvée' });
            return;
        }

        res.status(200).json({ message: 'Catégorie supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la catégorie:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie' });
    }
};

export const getCategoryById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!id) {
            res.status(400).json({ message: 'ID de catégorie non fourni' });
            return;
        }

        const category = await Category.findOne({ _id: id, user: userId });

        if (!category) {
            res.status(404).json({ message: 'Catégorie non trouvée' });
            return;
        }

        res.status(200).json(category);
    } catch (error) {
        console.error('Erreur lors de la récupération de la catégorie:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la catégorie' });
    }
};