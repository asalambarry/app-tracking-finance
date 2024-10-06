import mongoose, { Document, Model, Schema } from 'mongoose';

// Interface pour le document BlacklistedToken
export interface IBlacklistedToken extends Document {
  token: string;
  createdAt: Date;
}

// Interface pour le modèle BlacklistedToken
interface IBlacklistedTokenModel extends Model<IBlacklistedToken> {
  // Vous pouvez ajouter ici des méthodes statiques si nécessaire
}

// Schéma BlacklistedToken
const BlacklistedTokenSchema: Schema = new Schema({
  token: {
    type: String,
    required: [true, 'Le token est requis'],
    unique: true,
    index: true // Ajoute un index pour améliorer les performances de recherche
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // Le document sera automatiquement supprimé après 24 heures
  }
});

// Création et export du modèle
const BlacklistedToken = mongoose.model<IBlacklistedToken, IBlacklistedTokenModel>('BlacklistedToken', BlacklistedTokenSchema);
export default BlacklistedToken;