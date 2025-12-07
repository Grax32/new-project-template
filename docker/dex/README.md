# Dex OAuth Server Setup

Dex is an OpenID Connect (OIDC) identity provider running locally for development and testing OAuth flows.

## Access

- **Dex Server**: http://localhost:5556/dex
- **Discovery URL**: http://localhost:5556/dex/.well-known/openid-configuration
- **Health Check**: http://localhost:5556/healthz

## Test Users

### Admin User
- **Email**: admin@example.com
- **Password**: admin123
- **Username**: admin
- **Groups**: admins, users
- **User ID**: 08a8684b-db88-4b73-90a9-3cd1661f5466

### Member User
- **Email**: member@example.com
- **Password**: member123
- **Username**: member
- **Groups**: users
- **User ID**: 41331323-6f44-45e6-b3b9-2c4b60c02be5

## Registered OAuth Clients

### Web Application
- **Client ID**: web-app
- **Client Secret**: web-app-secret
- **Redirect URIs**: 
  - http://localhost:4200/callback
  - http://localhost:4200/auth/callback

### API Server
- **Client ID**: api-server
- **Client Secret**: api-server-secret
- **Redirect URIs**: 
  - http://localhost:6314/callback
  - http://localhost:6314/auth/callback

## Configuration

The Dex configuration is in `docker/dex/config.yaml`. It uses:
- **In-memory storage** (no persistence needed for dev)
- **Password connector** for simple username/password auth
- **Static users** defined in config (no database needed)

## Testing OAuth Flow

1. Start services: `npm run dev`
2. Navigate to your app at http://localhost:4200
3. Click login/authenticate
4. You'll be redirected to Dex at http://localhost:5556/dex/auth
5. Enter one of the test user credentials
6. Dex redirects back with authorization code
7. Your app exchanges code for tokens

## OIDC Endpoints

- **Authorization**: http://localhost:5556/dex/auth
- **Token**: http://localhost:5556/dex/token
- **UserInfo**: http://localhost:5556/dex/userinfo
- **JWKS**: http://localhost:5556/dex/keys

## Changing Passwords

Passwords are bcrypt hashed. To generate a new hash:

```bash
# Using htpasswd (if available)
htpasswd -bnBC 10 "" <password> | tr -d ':\n'

# Or use an online bcrypt generator
# Cost factor: 10
```

Then update the hash in `docker/dex/config.yaml`.

## Production Notes

⚠️ **This is a development setup only!**

For production:
- Use a real identity provider (Auth0, Okta, Azure AD, etc.)
- Or configure Dex with persistent storage (PostgreSQL, etcd, etc.)
- Use HTTPS for all OAuth endpoints
- Store secrets securely (not in config files)
- Implement proper user management
