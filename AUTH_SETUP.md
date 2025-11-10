# Authentication Setup Guide

This guide will help you set up the secure local authentication system for BorrowArr.

## Backend Setup

### 1. Install Dependencies

Navigate to the `server` directory and install the required packages:

```bash
cd server
npm install
```

The following packages will be installed:
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation and verification
- `express-rate-limit` - Rate limiting for security
- `helmet` - Security headers
- `uuid` - UUID generation for user IDs

### 2. Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Server Configuration
PORT=3002

# JWT Configuration
# IMPORTANT: Generate strong, random secrets for production!
# Use: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-access-token-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-token-key-change-this-in-production

# JWT Token Expiration
# Format: number followed by s (seconds), m (minutes), h (hours), d (days)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Bcrypt Salt Rounds (12 is recommended for security)
BCRYPT_SALT_ROUNDS=12
```

### 3. Generate Secure Secrets

**IMPORTANT**: Never use the example secrets in production! Generate strong, random secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32
```

Copy the generated strings into your `.env` file.

### 4. Database Migration

The User model will be automatically created when you start the server. The database will sync automatically.

### 5. Start the Server

```bash
npm start
```

## Security Features

### Password Security
- **Bcrypt Hashing**: Passwords are hashed with bcrypt using 12 salt rounds
- **Minimum Length**: Passwords must be at least 8 characters
- **No Plain Text Storage**: Passwords are never stored in plain text

### JWT Tokens
- **Access Tokens**: Short-lived (15 minutes default) for API requests
- **Refresh Tokens**: Long-lived (7 days default) for token renewal
- **Separate Secrets**: Access and refresh tokens use different secrets
- **Automatic Refresh**: Frontend automatically refreshes expired access tokens

### Rate Limiting
- **Auth Endpoints**: Limited to 5 requests per 15 minutes
- **Prevents Brute Force**: Protects against password guessing attacks

### Security Headers
- **Helmet**: Adds security headers to all responses
- **CORS**: Configured for cross-origin requests

## API Endpoints

### Public Endpoints

#### Register
```
POST /api/auth/register
Body: {
  "username": "string (3-30 chars, alphanumeric + underscore)",
  "email": "string (valid email)",
  "password": "string (min 8 chars)"
}
Response: {
  "success": true,
  "user": { ... },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### Login
```
POST /api/auth/login
Body: {
  "username": "string (username or email)",
  "password": "string"
}
Response: {
  "success": true,
  "user": { ... },
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### Refresh Token
```
POST /api/auth/refresh
Body: {
  "refreshToken": "string"
}
Response: {
  "success": true,
  "accessToken": "string"
}
```

#### Verify Token
```
GET /api/auth/verify
Headers: {
  "Authorization": "Bearer <accessToken>"
}
Response: {
  "success": true,
  "user": { ... }
}
```

### Protected Endpoints (Require Authentication)

#### Get Profile
```
GET /api/auth/profile
Headers: {
  "Authorization": "Bearer <accessToken>"
}
Response: {
  "success": true,
  "user": { ... }
}
```

#### Update Profile
```
PUT /api/auth/profile
Headers: {
  "Authorization": "Bearer <accessToken>"
}
Body: {
  "username": "string (optional)",
  "email": "string (optional)",
  "avatarUrl": "string (optional)"
}
Response: {
  "success": true,
  "user": { ... }
}
```

#### Change Password
```
POST /api/auth/change-password
Headers: {
  "Authorization": "Bearer <accessToken>"
}
Body: {
  "currentPassword": "string",
  "newPassword": "string (min 8 chars)"
}
Response: {
  "success": true,
  "message": "Password updated successfully"
}
```

## Frontend Setup

The frontend is already configured to use the new authentication system:

1. **AuthContext**: Provides authentication state and methods
2. **Login/Register Pages**: Updated to use the new API
3. **AuthRouter**: Protects routes and redirects unauthenticated users
4. **Account Page**: Displays user information

### Using Authentication in Components

```tsx
import { useAuth } from "@/context/AuthContext";

function MyComponent() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.username}!</div>;
}
```

## User Model Schema

```javascript
{
  id: UUID (primary key, auto-generated),
  username: String (unique, 3-30 chars, alphanumeric + underscore),
  email: String (unique, valid email),
  passwordHash: String (bcrypt hashed, never exposed),
  avatarUrl: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

## Migration from Firebase

If you're migrating from Firebase:

1. Users will need to register new accounts
2. The old `Users` model (with `gid`) is separate from the new `User` model
3. You may need to update references from `userId` (Firebase UID) to `user.id` (UUID)
4. MonitoredMovies and MonitoredSeries may need to be updated to use the new user ID format

## Troubleshooting

### Token Expired Errors
- Access tokens expire after 15 minutes
- The frontend automatically refreshes tokens using the refresh token
- If refresh fails, user is logged out

### Rate Limiting
- If you hit rate limits, wait 15 minutes
- Rate limits reset automatically

### Database Issues
- Ensure SQLite database file is writable
- Check that models are properly synced
- Verify database connection in server logs

## Production Checklist

- [ ] Generate strong, random JWT secrets
- [ ] Set appropriate token expiration times
- [ ] Configure CORS for your domain
- [ ] Set up HTTPS (required for secure cookies/tokens)
- [ ] Review rate limiting settings
- [ ] Test password reset flow (if implemented)
- [ ] Set up monitoring for failed login attempts
- [ ] Review and update security headers
- [ ] Test token refresh flow
- [ ] Verify all protected routes require authentication

