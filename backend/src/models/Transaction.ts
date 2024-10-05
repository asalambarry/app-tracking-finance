import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  title: string;
  amount: number;
  type: 'revenu' | 'dépense';
  date: Date;
  user: mongoose.Types.ObjectId;
}

const TransactionSchema: Schema = new Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['revenu', 'dépense'], required: true },
  date: { type: Date, default: Date.now },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);