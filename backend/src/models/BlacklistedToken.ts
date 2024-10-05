import mongoose, { Document, Schema } from 'mongoose';

export interface IBlacklistedToken extends Document {
  token: string;
  createdAt: Date;
}

const BlacklistedTokenSchema: Schema = new Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: '24h' }
});

export default mongoose.model<IBlacklistedToken>('BlacklistedToken', BlacklistedTokenSchema);