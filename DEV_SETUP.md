
---

### 🌐 ExpressTS Backend – `README.md`

```markdown
# Work Flow — ExpressTS Backend
```

This is the Express.js + TypeScript backend for **Work Flow**, a productivity and project workflow management system for teams and admins.

### This project uses POSTGRESQL VERSION: 14.17

## 🚀 Features
- REST API with Role-based Auth (JWT)
- Task & project lifecycle management
- Staff attendance, layoff, and performance tracking
- Admin stats and analytics endpoints
- Scalable folder structure with CI/CD support

## 🛠️ Tech Stack
- Node.js + Express.js
- TypeScript
- JWT Auth

## 📦 Getting Started
```bash
npm install
npm install express
npm install --save-dev typescript ts-node @types/express @types/node nodemon
npm install typorm dotenv
Npm install pg --save
npm run dev
```

## Make sure these compiler options are in tsconfig.json
Check to make sure of the following in tsconfig.json
```typescript
{
  "compilerOptions": {
    ...
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES6",
    "module": "commonjs"
  }
}
```

## Import reflect-metadata at the very top of your entry point
At the top of ```src/index.ts``` or ```main.ts``` (before anything else):
```typescript
import 'reflect-metadata';
```


## Setup basic Auth (JWT & Bcrypt)
```bash
npm run typeorm -- migration:run:dev -d src/data-source.ts
```

## Usage

### Development
```bash
npm run dev
```

## Project Structure

```
workflow-backend/
├── src/
│   ├── entities/        # TypeORM entities
│   │   ├── User.ts
│   │   ├── Organization.ts
│   │   └── Invitation.ts
│   ├── services/        # Business logic
│   │   └── InvitationService.ts
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── .env.example         # Example environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is **proprietary / source-available**.

The source code is visible for evaluation purposes only.
Unauthorized use, redistribution, or commercial use is prohibited.

See the [LICENSE](./LICENSE) file for details.
