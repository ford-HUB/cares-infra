# CARES Admin Web Portal

Web-based CMS for administrators to manage content displayed in the CARES mobile application.

## Authentication flow

1. **Admin login** — email + password
2. **Role verification** — Super Admin or Event Coordinator (determines sidebar access)
3. **Two-factor authentication** — optional 6-digit code (enabled for all demo accounts)
4. **Dashboard** — role-specific overview and CMS navigation

## Demo accounts

| Role | Email | Password | 2FA code |
|------|-------|----------|----------|
| Super Admin | `superadmin@cares.local` | `admin123` | `123456` |
| Event Coordinator | `coordinator@cares.local` | `admin123` | `123456` |

## Role permissions

**Super Admin**
- Full system access
- Manage users and all content
- Reports and analytics

**Event Coordinator**
- Create and manage events
- View event registrations
- Create and manage donation campaigns

## Development

```bash
cd admin-portal
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The Vite dev server proxies `/api/*` to the NestJS backend at `http://localhost:9000` for future API integration.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- CSS modules (green palette aligned with the mobile app)

## Next steps

- Connect login to NestJS admin auth endpoints
- CRUD modules for events, donations, and users
- Real 2FA (TOTP / email OTP)
- Publish pipeline to mobile app API
