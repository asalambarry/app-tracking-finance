import { createObjectCsvWriter } from 'csv-writer';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Category from '../models/Category';
import Transaction, { ITransaction } from '../models/Transaction';

// Définition d'une interface étendue pour inclure userId
interface AuthRequest extends Request {
    userId?: string;
}

export const addTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, amount, type,category, date } = req.body;
        const userId = req.userId; // Obtenu du middleware d'authentification

        // Validation des données
        if (!title || !amount || !type || !userId) {
            res.status(400).json({ message: 'Tous les champs sont requis' });
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            res.status(400).json({ message: 'Le montant doit être un nombre positif' });
            return;
        }

        if (type !== 'revenu' && type !== 'dépense') {
            res.status(400).json({ message: 'Le type doit être "revenu" ou "dépense"' });
            return;
        }
        const transactionDate = date ? new Date(date) : new Date();
        if (isNaN(transactionDate.getTime())) {
            res.status(400).json({ message: 'La date fournie n\'est pas valide' });
            return;
        }
// Vérifier si la catégorie existe pour cet utilisateur
const existingCategory = await Category.findOne({ name: category, user: userId });
if (!existingCategory) {
    res.status(400).json({ message: 'Catégorie non valide' });
    return;
}

        const newTransaction: ITransaction = new Transaction({
            title,
            amount,
            type,
            category,
            date: date || new Date(),
            user: userId
        });

        await newTransaction.save();

        res.status(201).json({ message: 'Transaction ajoutée avec succès', transaction: newTransaction });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la transaction', error });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const transactions = await Transaction.find({ user: userId })
            .populate('category', 'name') // Ceci suppose que vous avez une référence à la catégorie dans le modèle Transaction
            .sort({ date: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions' });
    }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const transaction = await Transaction.findOne({ _id: id, user: userId })
            .populate('category', 'name');
        if (!transaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }
        res.status(200).json(transaction);
    } catch (error) {
        console.error('Erreur lors de la récupération de la transaction:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la transaction' });
    }
};
export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, amount, type, category, date } = req.body;
        const userId = req.userId;

        // Vérifier si la transaction existe et appartient à l'utilisateur
        const existingTransaction = await Transaction.findOne({ _id: id, user: userId });
        if (!existingTransaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }
        // Validation des données
        if (title !== undefined && title.trim() === '') {
            res.status(400).json({ message: 'Le titre ne peut pas être vide' });
            return;
        }

        if (amount !== undefined) {
            if (isNaN(amount) || amount <= 0) {
                res.status(400).json({ message: 'Le montant doit être un nombre positif' });
                return;
            }
        }
        if (type !== undefined) {
            if (type !== 'revenu' && type !== 'dépense') {
                res.status(400).json({ message: 'Le type doit être "revenu" ou "dépense"' });
                return;
            }

            if (type === 'revenu' && amount !== undefined && amount < 0) {
                res.status(400).json({ message: 'Le montant d\'un revenu ne peut pas être négatif' });
                return;
            }
        }
        if (date !== undefined) {
            const transactionDate = new Date(date);
            if (isNaN(transactionDate.getTime())) {
                res.status(400).json({ message: 'La date fournie n\'est pas valide' });
                return;
            }
        }
         // Vérifier si la catégorie existe pour cet utilisateur
         if (category) {
            const existingCategory = await Category.findOne({ name: category, user: userId });
            if (!existingCategory) {
                res.status(400).json({ message: 'Catégorie non valide' });
                return;
            }
        }


        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: id, user: userId },
            { title, amount, type, category, date },
            { new: true, runValidators: true }
        ).populate('category', 'name');

        if (!updatedTransaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }

        res.status(200).json({ message: 'Transaction mise à jour avec succès', transaction: updatedTransaction });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la transaction', error });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!id) {
            res.status(400).json({ message: 'ID de transaction non fourni' });
            return;
        }
        // Vérifier si la transaction existe et appartient à l'utilisateur
        const transaction = await Transaction.findOne({ _id: id, user: userId });

        if (!transaction) {
            res.status(404).json({ message: 'Transaction non trouvée ou non autorisée' });
            return;
        }


        const deletedTransaction = await Transaction.findOneAndDelete({ _id: id, user: userId });

        if (!deletedTransaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }

        res.status(200).json({ message: 'Transaction supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de la transaction', error });
    }
};
export const getFilteredTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type, startDate, endDate, searchTerm, category } = req.query;
        const userId = req.userId;

        let query: any = { user: userId };

        // Filtre par type
        if (type && (type === 'revenu' || type === 'dépense')) {
            query.type = type;
        }

        // Filtre par date
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        // Recherche par titre
        if (searchTerm) {
            query.title = { $regex: searchTerm, $options: 'i' };
        }

        // Filtre par catégorie
        if (category) {
            query.category = category;
        }

        const transactions = await Transaction.find(query)
            .populate('category', 'name')
            .sort({ date: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions filtrées:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions filtrées' });
    }
}

export const generateFinancialReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.userId;

        if (!startDate || !endDate) {
            res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
            return;
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Récupérer les transactions pour la période donnée, groupées par catégorie
        const transactionsByCategory = await Transaction.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: { type: '$type', category: '$category' },
                    total: { $sum: '$amount' },
                    transactions: { $push: '$$ROOT' }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    categories: {
                        $push: {
                            category: '$_id.category',
                            total: '$total',
                            transactions: '$transactions'
                        }
                    },
                    total: { $sum: '$total' }
                }
            }
        ]);

        // Préparer le rapport
        const report = {
            periode: {
                debut: start,
                fin: end
            },
            revenus: { total: 0, categories: [] },
            depenses: { total: 0, categories: [] },
            soldeFinal: 0
        };

        transactionsByCategory.forEach(item => {
            if (item._id === 'revenu') {
                report.revenus = item;
            } else if (item._id === 'dépense') {
                report.depenses = item;
            }
        });

        report.soldeFinal = report.revenus.total - report.depenses.total;

        res.status(200).json(report);
    } catch (error) {
        console.error('Erreur lors de la génération du rapport financier:', error);
        res.status(500).json({ message: 'Erreur lors de la génération du rapport financier' });
    }
};
export const exportFinancialReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, format } = req.query;
        const userId = req.userId;

        if (!startDate || !endDate || !format) {
            res.status(400).json({ message: 'Les dates de début et de fin, ainsi que le format sont requis' });
            return;
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        const transactions = await Transaction.find({
            user: userId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        const totalRevenues = transactions
            .filter(t => t.type === 'revenu')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDepenses = transactions
            .filter(t => t.type === 'dépense')
            .reduce((sum, t) => sum + t.amount, 0);

        const soldeFinal = totalRevenues - totalDepenses;

        if (format === 'pdf') {
            await exportToPDF(res, start, end, transactions, totalRevenues, totalDepenses, soldeFinal);
        } else if (format === 'csv') {
            await exportToCSV(res, start, end, transactions, totalRevenues, totalDepenses, soldeFinal);
        } else {
            res.status(400).json({ message: 'Format non supporté. Utilisez "pdf" ou "csv".' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'exportation du rapport financier', error });
    }
};
async function exportToPDF(res: Response, start: Date, end: Date, transactions: any[], totalRevenues: number, totalDepenses: number, soldeFinal: number) {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_financier_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    doc.fontSize(18).text('Rapport Financier', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Période: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Total des revenus: ${totalRevenues} €`);
    doc.text(`Total des dépenses: ${totalDepenses} €`);
    doc.text(`Solde final: ${soldeFinal} €`);
    doc.moveDown();

    doc.text('Transactions:', { underline: true });
    transactions.forEach((t, index) => {
        doc.text(`${index + 1}. ${t.title} - ${t.amount} € (${t.type}) - ${new Date(t.date).toLocaleDateString()}`);
    });

    doc.end();
}

async function exportToCSV(res: Response, start: Date, end: Date, transactions: any[], totalRevenues: number, totalDepenses: number, soldeFinal: number) {
    const csvWriter = createObjectCsvWriter({
        path: path.resolve(__dirname, '../../temp/rapport_financier.csv'),
        header: [
            { id: 'title', title: 'Titre' },
            { id: 'amount', title: 'Montant' },
            { id: 'type', title: 'Type' },
            { id: 'category', title: 'Catégorie' },
            { id: 'date', title: 'Date' }
        ]
    });

    await csvWriter.writeRecords(transactions.map(t => ({
        ...t,
        category: t.category.name, // Supposant que la catégorie a été peuplée
        date: new Date(t.date).toLocaleDateString()
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_financier_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);

    const fileStream = fs.createReadStream(path.resolve(__dirname, '../../temp/rapport_financier.csv'));
    fileStream.pipe(res);
}