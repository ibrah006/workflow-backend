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
- npm or yarn
- <a href="https://www.enterprisedb.com/download-postgresql-binaries">PostgreSQL</a> (Please download v17.7 for best compatibility)

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
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=workflow_db

# Application
PORT=3000
NODE_ENV=development

# JWT (if applicable)
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Email (for invitations)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

4. Run database migrations:
```bash
npm run migration:run
```

## Usage

### Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

## API Documentation

### Invitations

#### Send Invitation
```http
POST /api/invitations
Content-Type: application/json

{
  "email": "user@example.com",
  "organizationId": "uuid",
  "role": "member"
}
```

#### Get Organization Invitations
```http
GET /api/invitations/organization/:organizationId?status=PENDING
```

#### Accept Invitation
```http
POST /api/invitations/:token/accept
```

#### Cancel Invitation
```http
DELETE /api/invitations/:invitationId
```

#### Get User Pending Invitations
```http
GET /api/invitations/user/:email
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

## Database Schema

### Invitation Entity
- `id` - Unique identifier
- `email` - Invitee email address
- `organizationId` - Organization reference
- `invitedById` - User who sent the invitation
- `token` - Unique invitation token
- `role` - User role in organization
- `status` - PENDING | ACCEPTED | CANCELLED | EXPIRED
- `expiresAt` - Invitation expiration date
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

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
