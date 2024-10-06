import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction';

interface AuthRequest extends Request {
    userId?: string;
}

export const getDashboardData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);

        const transactionsByCategory = await Transaction.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: { type: '$type', category: '$category' },
                    total: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    categories: {
                        $push: {
                            category: '$_id.category',
                            total: '$total'
                        }
                    },
                    total: { $sum: '$total' }
                }
            }
        ]);

        const dashboardData = {
            revenu: { total: 0, categories: [] },
            depense: { total: 0, categories: [] },
            soldeTotal: 0
        };

        transactionsByCategory.forEach(item => {
            if (item._id === 'revenu') {
                dashboardData.revenu = item;
            } else if (item._id === 'dépense') {
                dashboardData.depense = item;
            }
        });

        dashboardData.soldeTotal = dashboardData.revenu.total - dashboardData.depense.total;

        res.status(200).json(dashboardData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données du tableau de bord:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des données du tableau de bord' });
    }
}

export const getChartData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { period } = req.query;
        const userId = new mongoose.Types.ObjectId(req.userId);
        let groupBy: { $dateToString: { format: string; date: "$date" } };

        switch (period) {
            case 'daily':
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
                break;
            case 'weekly':
                groupBy = { $dateToString: { format: "%Y-W%V", date: "$date" } };
                break;
            case 'monthly':
            default:
                groupBy = { $dateToString: { format: "%Y-%m", date: "$date" } };
                break;
        }

        const chartData = await Transaction.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: {
                        date: groupBy,
                        type: "$type",
                        category: "$category"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: {
                        date: "$_id.date",
                        type: "$_id.type"
                    },
                    categories: {
                        $push: {
                            category: "$_id.category",
                            total: "$total"
                        }
                    },
                    total: { $sum: "$total" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    data: {
                        $push: {
                            type: "$_id.type",
                            categories: "$categories",
                            total: "$total"
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json(chartData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données du graphique:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des données du graphique' });
    }
};

export const getCategoryChartData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { type } = req.query;

        if (type !== 'revenu' && type !== 'dépense') {
            res.status(400).json({ message: 'Type invalide. Doit être "revenu" ou "dépense".' });
            return;
        }

        const categoryData = await Transaction.aggregate([
            { $match: { user: userId, type: type } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } }
        ]);

        res.status(200).json(categoryData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données du graphique par catégorie:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des données du graphique' });
    }
};
export const getCategoryTrends = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { type, period = 'monthly' } = req.query;

        if (type !== 'revenu' && type !== 'dépense') {
            res.status(400).json({ message: 'Type invalide. Doit être "revenu" ou "dépense".' });
            return;
        }

        let groupByDate: { $dateToString: { format: string; date: "$date" } };
        switch (period) {
            case 'weekly':
                groupByDate = { $dateToString: { format: "%Y-W%V", date: "$date" } };
                break;
            case 'monthly':
            default:
                groupByDate = { $dateToString: { format: "%Y-%m", date: "$date" } };
                break;
        }

        const categoryTrends = await Transaction.aggregate([
            { $match: { user: userId, type: type } },
            {
                $group: {
                    _id: {
                        date: groupByDate,
                        category: "$category"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    categories: {
                        $push: {
                            category: "$_id.category",
                            total: "$total"
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json(categoryTrends);
    } catch (error) {
        console.error('Erreur lors de la récupération des tendances par catégorie:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des tendances par catégorie' });
    }
};


export const compareCategoryPeriods = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { type, startDate1, endDate1, startDate2, endDate2 } = req.query;

        if (type !== 'revenu' && type !== 'dépense') {
            res.status(400).json({ message: 'Type invalide. Doit être "revenu" ou "dépense".' });
            return;
        }

        const comparison = await Transaction.aggregate([
            {
                $match: {
                    user: userId,
                    type: type,
                    date: {
                        $gte: new Date(startDate1 as string),
                        $lte: new Date(endDate2 as string)
                    }
                }
            },
            {
                $project: {
                    category: 1,
                    amount: 1,
                    period: {
                        $cond: [
                            { $and: [
                                { $gte: ["$date", new Date(startDate1 as string)] },
                                { $lte: ["$date", new Date(endDate1 as string)] }
                            ]},
                            "period1",
                            "period2"
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        category: "$category",
                        period: "$period"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.category",
                    periods: {
                        $push: {
                            period: "$_id.period",
                            total: "$total"
                        }
                    }
                }
            }
        ]);

        res.status(200).json(comparison);
    } catch (error) {
        console.error('Erreur lors de la comparaison des catégories entre périodes:', error);
        res.status(500).json({ message: 'Erreur lors de la comparaison des catégories entre périodes' });
    }
};
export const getMonthlyBalance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { year } = req.query;

        if (!year || isNaN(Number(year))) {
            res.status(400).json({ message: 'Année invalide' });
            return;
        }

        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${Number(year) + 1}-01-01`);

        const monthlyBalance = await Transaction.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: { $month: "$date" },
                    revenus: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "revenu"] }, "$amount", 0]
                        }
                    },
                    depenses: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "dépense"] }, "$amount", 0]
                        }
                    }
                }
            },
            {
                $project: {
                    mois: "$_id",
                    revenus: 1,
                    depenses: 1,
                    balance: { $subtract: ["$revenus", "$depenses"] }
                }
            },
            { $sort: { mois: 1 } }
        ]);

        res.status(200).json(monthlyBalance);
    } catch (error) {
        console.error('Erreur lors de la récupération du bilan mensuel:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du bilan mensuel' });
    }
};

export const getTopCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { type, limit = 5 } = req.query;

        if (type !== 'revenu' && type !== 'dépense') {
            res.status(400).json({ message: 'Type invalide. Doit être "revenu" ou "dépense".' });
            return;
        }

        const topCategories = await Transaction.aggregate([
            { $match: { user: userId, type: type } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $limit: Number(limit) }
        ]);

        res.status(200).json(topCategories);
    } catch (error) {
        console.error('Erreur lors de la récupération des meilleures catégories:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des meilleures catégories' });
    }
};
export const getRecentTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { limit = 5, page = 1 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const recentTransactions = await Transaction.find({ user: userId })
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('category', 'name');

        const total = await Transaction.countDocuments({ user: userId });

        res.status(200).json({
            transactions: recentTransactions,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions récentes:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions récentes' });
    }
};
export const getTransactionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { transactionId } = req.params;

        const transaction = await Transaction.findOne({ _id: transactionId, user: userId })
            .populate('category', 'name');

        if (!transaction) {
            res.status(404).json({ message: 'Transaction non trouvée' });
            return;
        }

        res.status(200).json(transaction);
    } catch (error) {
        console.error('Erreur lors de la récupération des détails de la transaction:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails de la transaction' });
    }
};
export const getTransactionStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { startDate, endDate } = req.query;

        const stats = await Transaction.aggregate([
            {
                $match: {
                    user: userId,
                    date: {
                        $gte: new Date(startDate as string),
                        $lte: new Date(endDate as string)
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalRevenu: {
                        $sum: { $cond: [{ $eq: ["$type", "revenu"] }, "$amount", 0] }
                    },
                    totalDepense: {
                        $sum: { $cond: [{ $eq: ["$type", "dépense"] }, "$amount", 0] }
                    },
                    avgTransaction: { $avg: "$amount" },
                    maxTransaction: { $max: "$amount" },
                    minTransaction: { $min: "$amount" }
                }
            }
        ]);

        res.status(200).json(stats[0] || {});
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des transactions:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques des transactions' });
    }
};
export const getCategoryDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { type } = req.query;

        if (type !== 'revenu' && type !== 'dépense') {
            res.status(400).json({ message: 'Type invalide. Doit être "revenu" ou "dépense".' });
            return;
        }

        const distribution = await Transaction.aggregate([
            { $match: { user: userId, type: type } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    category: '$categoryInfo.name',
                    total: 1
                }
            },
            { $sort: { total: -1 } }
        ]);

        const total = distribution.reduce((sum, item) => sum + item.total, 0);
        const distributionWithPercentage = distribution.map(item => ({
            ...item,
            percentage: (item.total / total) * 100
        }));

        res.status(200).json(distributionWithPercentage);
    } catch (error) {
        console.error('Erreur lors de la récupération de la distribution des catégories:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la distribution des catégories' });
    }
};

export const getYearlyComparison = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const { year } = req.query;

        if (!year || isNaN(Number(year))) {
            res.status(400).json({ message: 'Année invalide' });
            return;
        }

        const currentYear = Number(year);
        const previousYear = currentYear - 1;

        const startDatePrevious = new Date(`${previousYear}-01-01`);
        const endDateCurrent = new Date(`${currentYear + 1}-01-01`);

        const yearlyData = await Transaction.aggregate([
            {
                $match: {
                    user: userId,
                    date: {
                        $gte: startDatePrevious,
                        $lt: endDateCurrent
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        type: "$type"
                    },
                    total: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.year",
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

        res.status(200).json(yearlyData);
    } catch (error) {
        console.error('Erreur lors de la récupération de la comparaison annuelle:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la comparaison annuelle' });
    }
};