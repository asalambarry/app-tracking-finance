
import dotenv from 'dotenv';
import express, { Express } from 'express';
import connectDB from './config/db';
import categoryRoutes from './routes/categoryRoutes';
import dashboardRoutes from './routes/dashRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoute';

// Chargement des variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app: Express = express();
const port: number = parseInt(process.env.PORT || '5002', 10);

// Middleware
app.use(express.json());

// Connexion à MongoDB
connectDB();

// Définition des routes
const defineRoutes = (): void => {
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Route de base
  app.get('/', (req, res) => {
    res.send('Bienvenue sur l\'API de gestion financière!');
  });
};

// Application des routes
defineRoutes();

// Démarrage du serveur
const startServer = (): void => {
  app.listen(port, () => {
    console.log(`Serveur en cours d'exécution sur le port ${port}`);
  });
};

startServer();

export default app;