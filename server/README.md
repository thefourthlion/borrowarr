# SQLite Node.js Server

Auto-generated Node.js server with SQLite database.

## Features

- Express.js REST API
- SQLite database with Sequelize ORM
- CRUD operations
- Docker support

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Install dependencies:
```bash
# Using npm
npm install

# Using pnpm
pnpm install
pnpm rebuild sqlite3
```

2. Set up environment variables:
Copy `.env` file and update if needed.

3. Start the server:
```bash
npm start
# or
pnpm start
```

### Docker Setup

Run with Docker:
```bash
docker build -t sqlite-server .
docker run -p 3002:3002 sqlite-server
```

## API Endpoints

Your custom model routes will be available at `/api/{model_name}/`

### Standard CRUD Operations
- `POST /api/{model}/create` - Create new record
- `GET /api/{model}/read` - Read all records (with pagination)
- `GET /api/{model}/read/:id` - Read specific record by ID
- `PUT /api/{model}/update/:id` - Update record by ID
- `DELETE /api/{model}/delete/:id` - Delete record by ID

## Environment Variables

- `PORT` - Server port (default: 3002)

## Database

The SQLite database file `database.sqlite` is automatically created in the project root. The database is managed through Sequelize ORM with automatic migrations.

## Troubleshooting

### SQLite3 binding errors with pnpm

If you encounter binding errors after installation:
```bash
pnpm rebuild sqlite3
```
