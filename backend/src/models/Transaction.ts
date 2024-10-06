import mongoose, { Document, Model, Schema } from 'mongoose';

// Définition du type pour le champ 'type'
type TransactionType = 'revenu' | 'dépense';

// Interface pour le document Transaction
export interface ITransaction extends Document {
  title: string;
  amount: number;
  type: TransactionType;
  category: mongoose.Types.ObjectId;
  date: Date;
  user: mongoose.Types.ObjectId;
}

// Interface pour le modèle Transaction
interface ITransactionModel extends Model<ITransaction> {
  // Vous pouvez ajouter ici des méthodes statiques si nécessaire
}

// Schéma Transaction
const TransactionSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0, 'Le montant ne peut pas être négatif']
  },
  type: {
    type: String,
    enum: {
      values: ['revenu', 'dépense'],
      message: '{VALUE} n\'est pas un type valide'
    },
    required: [true, 'Le type est requis']
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La catégorie est requise']
  },
  date: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  }
}, {
  timestamps: true
});

// Indexation pour améliorer les performances des requêtes
TransactionSchema.index({ user: 1, date: -1 });

// Création et export du modèle
const Transaction = mongoose.model<ITransaction, ITransactionModel>('Transaction', TransactionSchema);
export default Transaction;