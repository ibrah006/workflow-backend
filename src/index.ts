import express from 'express';
import { AppDataSource } from './data-source';
import dotenv from 'dotenv';

const app = express();

dotenv.config();

const PORT = process.env.PORT;

console.log("port:", PORT);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next)=> {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Initialize Database
AppDataSource.initialize()
    .then(()=> {
        console.log("Connected to PostgreSQL Database ");
    })
    .catch((error)=> {
        console.error("Database connection error:", error);
    })

app.get('/', (req, res) => {
  res.send('Hello from Express + TypeScript backend for workflow!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
