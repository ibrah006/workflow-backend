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
import puppeteer, { executablePath } from "puppeteer";

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

app.get("/_api/preview", async (req, res) => {
  const url = (req.query.url)?.toString();
  if (!url) {
    res.status(400).json({message: "Missing url"});
    return;
  }
  const previewName = req.query.previewName;

  const targetUrl = new URL(url);
  const response = await fetch(targetUrl.href);
  let html = await response.text();

  const baseTag = `<base href="${targetUrl.origin}/">`;
  html = html.replace("<head>", `<head>${baseTag}`);

  // Inject widget script
  // const widgetScript = `
  //   <script src="http://localhost:3333/_api/widget?preview=true&previewName=${previewName}"></script>
  // `;
  // html = html.replace("</body>", `${widgetScript}</body>`);

  res.set("Content-Type", "text/html");
  res.send(html);
});

app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url?.toString();
  
  if (!targetUrl) {
      res.status(400).send('Missing url parameter');
      return;
  }
  
  // Optional: Validate the URL for security
  try {
      new URL(targetUrl);
  } catch (e) {
      res.status(400).send('Invalid URL');
      return;
  }
  
  createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
  })(req, res, next);
});

let browser: any = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/google-chrome",
      // args: [
      //   "--no-sandbox",
      //   "--disable-setuid-sandbox",
      //   "--disable-dev-shm-usage",
      //   "--disable-gpu"
      // ]
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }
  return browser;
}

async function takeScreenshot(url: string) {
  const browser = await getBrowser();
  // const browser = await puppeteer.launch({
  //   // headless: true,
  //   args: ["--no-sandbox", "--disable-setuid-sandbox"]
  // });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1280,
    height: 800
  });

  // Load the site
  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 30000
  });

  const screenshot = await page.screenshot({
    fullPage: true
  });

  await browser.close();
  return screenshot;
}


app.post("/_api/ss-preview", async (req, res) => {
  // const { url } = req.body;
  const url = req.query.url as string;

  if (!url || !url.startsWith("http")) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const image = await takeScreenshot(url);

    res.set("Content-Type", "image/png");
    res.send(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate preview" });
  }
});


app.listen(PORT, () => {
  const ip = getLocalExternalIp();
  console.log(`Server is running at http://${ip || 'localhost'}:${PORT}`);

  console.log(AppDataSource.entityMetadatas.map(m => m.name));
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