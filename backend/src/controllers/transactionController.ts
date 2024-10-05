import { Request, Response } from 'express';
import Transaction, { ITransaction } from '../models/Transaction';

export const addTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, amount, type, date } = req.body;

        // Validation des données
        if (!title || !amount || !type) {
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

        const newTransaction: ITransaction = new Transaction({
            title,
            amount,
            type,
            date: date || new Date()
        });

        await newTransaction.save();

        res.status(201).json({ message: 'Transaction ajoutée avec succès', transaction: newTransaction });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la transaction', error });
    }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions', error });
    }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }
        res.status(200).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la transaction', error });
    }
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, amount, type, date } = req.body;

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            id,
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

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const deletedTransaction = await Transaction.findByIdAndDelete(id);

        if (!deletedTransaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }

        res.status(200).json({ message: 'Transaction supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de la transaction', error });
    }
};

export const getFilteredTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, startDate, endDate, searchTerm } = req.query;

        let query: any = {};

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
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
    try {
        // Calculer le total des revenus
        const totalRevenues = await Transaction.aggregate([
            { $match: { type: 'revenu' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Calculer le total des dépenses
        const totalDepenses = await Transaction.aggregate([
            { $match: { type: 'dépense' } },
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

export const getChartData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { period } = req.query; // 'daily', 'weekly', ou 'monthly'
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
