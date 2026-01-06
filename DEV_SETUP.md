# Workflow Backend

A robust backend service for managing organizational workflows, user invitations, and team collaboration built with Node.js, TypeScript, and TypeORM.

## Features

- **User Management** - Complete user authentication and authorization
- **Organization Management** - Multi-tenant organization support
- **Invitation System** - Send, accept, and manage organization invitations
- **Role-Based Access Control** - Flexible permission management
- **RESTful API** - Clean and well-documented API endpoints

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL (or your database)
- **Authentication**: JWT (if applicable)

## Prerequisites

Before you begin, ensure you have the following installed:
- <a href="https://nodejs.org/en/download">Node.js</a> (v16 or higher)
- uses npm
- <a href="https://www.enterprisedb.com/downloads/postgres-postgresql-downloads">PostgreSQL</a> (Please download v17.7 for best compatibility)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ibrah006/workflow-backend.git
cd workflow-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DB_HOST=localhost
PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=workflow

# Application
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=secret_key
JWT_EXPIRES_IN=99d

# Do not edit this for local setup
IS_PRODUCTION=false

# ONLY FOR PRODUCTION
# Ignore this
# ...
```

4. Run database migrations:
```bash
npm run typeorm -- migration:run -d src/data-source.ts
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Project Link: [https://github.com/ibrah006/workflow-backend](https://github.com/ibrah006/workflow-backend)

## Acknowledgments

- TypeORM for excellent ORM capabilities
- Express.js community for middleware and best practices
- All contributors who help improve this project
