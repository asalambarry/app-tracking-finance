import mongoose, { Document, Model, Schema } from 'mongoose';

// Définition du type pour le champ 'type'
type CategoryType = 'revenu' | 'dépense';

// Interface pour le document Category
export interface ICategory extends Document {
  name: string;
  type: CategoryType;
  user: mongoose.Types.ObjectId;
}

// Interface pour le modèle Category
interface ICategoryModel extends Model<ICategory> {
  // Vous pouvez ajouter ici des méthodes statiques si nécessaire
}

// Schéma Category
const CategorySchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Le nom de la catégorie est requis'],
    trim: true,
    maxlength: [50, 'Le nom de la catégorie ne peut pas dépasser 50 caractères']
  },
  type: {
    type: String,
    enum: {
      values: ['revenu', 'dépense'],
      message: '{VALUE} n\'est pas un type valide'
    },
    required: [true, 'Le type de catégorie est requis']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  }
}, {
  timestamps: true
});

// Index composé pour assurer l'unicité du nom de catégorie par utilisateur et type
CategorySchema.index({ name: 1, user: 1, type: 1 }, { unique: true });

// Création et export du modèle
const Category = mongoose.model<ICategory, ICategoryModel>('Category', CategorySchema);
export default Category;