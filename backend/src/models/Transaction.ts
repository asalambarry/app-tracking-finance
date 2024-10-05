import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  title: string;
  amount: number;
  type: 'revenu' | 'dépense';
  date: Date;
}

const TransactionSchema: Schema = new Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['revenu', 'dépense'], required: true },
  date: { type: Date, default: Date.now }
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);