import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("La variable d'environnement MONGO_URI n'est pas définie.");
    }

    await mongoose.connect(uri);

    console.log('Connexion à MongoDB établie avec succès');
  } catch (err) {
    console.error('Erreur de connexion à MongoDB:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

// Gestion des événements de connexion
mongoose.connection.on('connected', () => {
  console.log('Mongoose connecté à la base de données');
});

mongoose.connection.on('error', (err: Error) => {
  console.error('Erreur de connexion Mongoose:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose déconnecté de la base de données');
});

// Gestion de la fermeture propre de la connexion
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Connexion à MongoDB fermée suite à l\'arrêt de l\'application');
  process.exit(0);
});

export default connectDB;