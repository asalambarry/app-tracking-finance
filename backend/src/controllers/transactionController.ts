import { Request, Response } from 'express';
import Transaction, { ITransaction } from '../models/Transaction';
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

// Définition d'une interface étendue pour inclure userId
interface AuthRequest extends Request {
    userId?: string;
}

export const addTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, amount, type, date } = req.body;
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


        const newTransaction: ITransaction = new Transaction({
            title,
            amount,
            type,
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
        const transactions = await Transaction.find({ user: userId }).sort({ date: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions', error });
    }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const transaction = await Transaction.findOne({ _id: id, user: userId });
        if (!transaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }
        res.status(200).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la transaction', error });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, amount, type, date } = req.body;
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


        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: id, user: userId },
            { title, amount, type, date },
            { new: true, runValidators: true }
        );

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
        const { type, startDate, endDate, searchTerm } = req.query;
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

        const transactions = await Transaction.find(query).sort({ date: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions filtrées', error });
    }
}

// Dashboard
export const getDashboardData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;

        // Calculer le total des revenus
        const totalRevenues = await Transaction.aggregate([
            { $match: { type: 'revenu', user: userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Calculer le total des dépenses
        const totalDepenses = await Transaction.aggregate([
            { $match: { type: 'dépense', user: userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Calculer le solde total
        const revenu = totalRevenues[0]?.total || 0;
        const depense = totalDepenses[0]?.total || 0;
        const soldeTotal = revenu - depense;

        // Préparer les données du tableau de bord
        const dashboardData = {
            revenuTotal: revenu,
            depenseTotal: depense,
            soldeTotal: soldeTotal,
            estPositif: soldeTotal >= 0
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des données du tableau de bord', error });
    }
}

export const getChartData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { period } = req.query; // 'daily', 'weekly', ou 'monthly'
        const userId = req.userId;
        let groupBy: { $dateToString: { format: string; date: string } };
        let sortBy: { [key: string]: number };

        switch (period) {
            case 'daily':
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
                sortBy = { "_id.date": 1 };
                break;
            case 'weekly':
                groupBy = { $dateToString: { format: "%Y-W%V", date: "$date" } };
                sortBy = { "_id.date": 1 };
                break;
            case 'monthly':
            default:
                groupBy = { $dateToString: { format: "%Y-%m", date: "$date" } };
                sortBy = { "_id.date": 1 };
                break;
        }

        const chartData = await Transaction.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: {
                        date: groupBy,
                        type: "$type"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    revenus: {
                        $sum: {
                            $cond: [{ $eq: ["$_id.type", "revenu"] }, "$total", 0]
                        }
                    },
                    depenses: {
                        $sum: {
                            $cond: [{ $eq: ["$_id.type", "dépense"] }, "$total", 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json(chartData);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des données du graphique', error });
    }
};

// Rapport financier
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

        // Récupérer les transactions pour la période donnée
        const transactions = await Transaction.find({
            user: userId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        // Calculer les totaux
        const totalRevenues = transactions
            .filter(t => t.type === 'revenu')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDepenses = transactions
            .filter(t => t.type === 'dépense')
            .reduce((sum, t) => sum + t.amount, 0);

        const soldeFinal = totalRevenues - totalDepenses;

        // Générer le rapport
        const report = {
            periode: {
                debut: start,
                fin: end
            },
            transactions: transactions,
            totalRevenues: totalRevenues,
            totalDepenses: totalDepenses,
            soldeFinal: soldeFinal
        };

        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la génération du rapport financier', error });
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
            { id: 'date', title: 'Date' }
        ]
    });

    await csvWriter.writeRecords(transactions.map(t => ({
        ...t,
        date: new Date(t.date).toLocaleDateString()
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_financier_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);

    const fileStream = fs.createReadStream(path.resolve(__dirname, '../../temp/rapport_financier.csv'));
    fileStream.pipe(res);
}