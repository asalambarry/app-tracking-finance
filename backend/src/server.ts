import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db';
import transactionRoutes from './routes/transactionRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5002;

// Connexion à MongoDB
connectDB();

app.use(express.json());
// Routes
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => {
  res.send('Bonjour, monde!');
});

app.listen(port, () => console.log(`Serveur en cours d'exécution sur le port ${port}`));