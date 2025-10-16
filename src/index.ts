import 'reflect-metadata';
import express from 'express';
import { AppDataSource } from './data-source';
import dotenv from 'dotenv';

import { authMiddleware } from './middleware/authMiddleware';

import usersRoutes from './routes/users';
import guestsRoutes from './routes/guests';
import projectRoutes from './routes/project';
import activityAndAttendance from './routes/activityAndAttendance';
import tasksRoutes from './routes/tasks';
import analyticsRoutes from './routes/analytics';
import materialLogRoutes from './routes/materialLog';
import companyRoutes from './routes/company';
import progressLogRoutes from './routes/progressLog';

import os from 'os';


const app = express();

dotenv.config();

const PORT = process.env.PORT;

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

app.use('/users', authMiddleware, usersRoutes);
app.use('/', guestsRoutes);
app.use('/projects', projectRoutes);
// Activity & Attendance routes
app.use('/activity', authMiddleware, activityAndAttendance)
// Task state
app.use('/tasks', authMiddleware, tasksRoutes)
// Analytics
app.use('/analytics', authMiddleware, analyticsRoutes);
// Material Logs
app.use('/material-logs', authMiddleware, materialLogRoutes);
// Companies routes
app.use('/companies', authMiddleware, companyRoutes)
// Progress log routes
app.use('/progressLogs', progressLogRoutes)

app.listen(PORT, () => {
  const ip = getLocalExternalIp();
  // console.log(`Server is running at http://${ip || 'localhost'}:${PORT}`);
});

function getLocalExternalIp(): string | undefined {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return undefined;
}

export default app;