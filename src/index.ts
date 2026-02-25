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
import organizationRoutes from './routes/organization';
import invitationRoutes from './routes/invitation';
import sampleOrganizationRoutes from './routes/sampleOrganization';
import materialRoutes from './routes/material';
import reportsRoutes from './routes/reports';

import os from 'os';
import printerRoutes from './routes/printer';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from "helmet";
import { chromium } from 'playwright';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket/task.websocketSetup';

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
app.use('/projects', authMiddleware, projectRoutes);
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
app.use('/organizations', authMiddleware, organizationRoutes)
// Invitation routes
app.use('/invitations', invitationRoutes)
// Sample Organization routes
app.use('/sample-organization', sampleOrganizationRoutes)
app.use('/material', authMiddleware, materialRoutes);
// Printer routes
app.use('/printers', authMiddleware, printerRoutes);
// Reports routes
app.use('/reports', authMiddleware, reportsRoutes);

app.use(helmet({
  frameguard: false  // Disables X-Frame-Options
}));

app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  // Or allow specific origins:
  // res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket servers
initializeWebSocket(httpServer); // Task WebSocket
initializeCompanyWebSocket(httpServer); // Company WebSocket


httpServer.listen(PORT, () => {
  const ip = getLocalExternalIp();
  console.log(`Server is running at http://${ip || 'localhost'}:${PORT}`);

  console.log(AppDataSource.entityMetadatas.map(m => m.name));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  await AppDataSource.destroy();
  process.exit(0);
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