
---

### 🌐 ExpressTS Backend – `README.md`

```markdown
# Work Flow — ExpressTS Backend
```

This is the Express.js + TypeScript backend for **Work Flow**, a productivity and project workflow management system for teams and admins.

## 🚀 Features
- REST API with Role-based Auth (JWT)
- Task & project lifecycle management
- Staff attendance, layoff, and performance tracking
- Admin stats and analytics endpoints
- Scalable folder structure with CI/CD support

## 🛠️ Tech Stack
- Node.js + Express.js
- TypeScript
- MongoDB with Mongoose
- JWT Auth
- Zod for validation

## 📦 Getting Started
```bash
npm install
npm install express
npm install --save-dev typescript ts-node @types/express @types/node nodemon
npm install typorm dotenv
npm run dev
```

# Dev Env Setup on Different OSs

## MacOS

### Setup PostgreSQL in just 2 steps!
1. Install Postgresql
```bash
brew install postgresql
# Start postgresql service
brew services start postgresql
```
Check brew services status
```bash
brew services list
```

2. Create DB user and DB
```bash
psql postgres
# Then inside the psql shell:
CREATE USER myuser WITH PASSWORD 'mypassword';
CREATE DATABASE mydb OWNER myuser;
\q
```

