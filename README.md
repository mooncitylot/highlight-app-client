# Starter Client

A bare-bones Lit web application starter with JWT authentication, user management, and protected routes.

## Features

- ✅ Lit web components framework
- ✅ JWT authentication with automatic token refresh
- ✅ HttpOnly cookie-based auth
- ✅ Client-side routing with route protection
- ✅ Login/Signup/Dashboard views
- ✅ Session management with localStorage
- ✅ Responsive design
- ✅ Hot module reloading (dev mode)

## Project Structure

```
starter-client/
├── src/
│   ├── app-enter.js         # Root application component
│   ├── session/
│   │   └── session.js       # Session state management
│   ├── services/
│   │   ├── api-fetch.js     # HTTP client with auth
│   │   ├── auth-refresh.js  # Token refresh logic
│   │   └── users.js         # User API calls
│   ├── router/
│   │   ├── routes.js        # Route definitions
│   │   └── router-mixin.js  # Routing + protection
│   ├── views/
│   │   ├── login/           # Login page components
│   │   ├── signup/          # Signup page components
│   │   └── dashboard/       # Dashboard page
│   ├── shared/
│   │   └── components/      # Shared components
│   └── styles/
│       └── global-styles.js # Global CSS
├── index.html               # HTML entry point
├── webpack.config.js        # Build configuration
├── package.json             # Dependencies
└── .env.template            # Environment variables

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.template .env
   ```

4. Update `.env` with your API URL:
   ```
   API_URL=http://localhost:8080
   APP_URL=https://localhost:8000
   ```

5. Start development server:
   ```bash
   npm start
   ```

6. Open browser to `https://localhost:8000`

## Build for Production

```bash
npm run build
```

Built files will be in `dist/` directory.

## Architecture

### Authentication Flow

1. **Login**: User enters credentials
   - Client sends POST to `/v1/auth/login` with deviceFingerprint
   - Server sets HttpOnly cookies (access_token, refresh_token)
   - Client stores user data and expiry in localStorage
   - Client redirects to dashboard

2. **Authenticated Requests**: 
   - HttpOnly cookies sent automatically
   - If 401 error, client attempts token refresh
   - If refresh fails, redirect to login

3. **Token Refresh**:
   - Client sends POST to `/v1/auth/refresh`
   - Server validates refresh token from cookie
   - Server issues new access token
   - Client updates localStorage expiry

4. **Logout**:
   - Client sends POST to `/v1/auth/logout`
   - Server clears HttpOnly cookies
   - Client clears localStorage
   - Client redirects to login

### Routing

Routes are defined in `src/router/routes.js`:

```javascript
{
  path: "/dashboard",
  componentPath: "dashboard/dashboard-container",
  componentName: "dashboard-container",
  isPublic: false,  // Requires authentication
  showNav: false,
  showHeader: true,
}
```

**Route Protection**: Routes with `isPublic: false` require authentication. If user is not authenticated, they're redirected to login.

**Lazy Loading**: View components are dynamically imported when route is accessed.

### Session Management

Session data is stored in `localStorage`:

```javascript
{
  user: {
    userId: "...",
    email: "...",
    username: "...",
    kind: "Player"
  },
  sessionExpiration: "2024-01-01T00:00:00Z"
}
```

**Why localStorage?**
- Survives page refreshes
- Faster than API calls for cached data
- Auth tokens in HttpOnly cookies (secure)

### API Client

The `apiFetch` function in `src/services/api-fetch.js`:

- Automatically includes credentials (cookies)
- Handles 401 errors with token refresh
- Extracts error messages from responses
- Redirects to login on auth failure

```javascript
import { apiFetch } from './services/api-fetch.js';

// GET request
const user = await apiFetch('/v1/users/me', 'GET');

// POST request
const result = await apiFetch('/v1/users/me/update', 'POST', {
  username: 'newname',
  email: 'new@email.com'
});
```

## Adding New Features

### Adding a New Page

1. Create view component in `src/views/mypage/`:
   ```javascript
   import { LitElement, html, css } from 'lit';
   
   class MyPageContainer extends LitElement {
     async routeEnter() {
       // Called when route loads
     }
     
     render() {
       return html`<h1>My Page</h1>`;
     }
   }
   
   customElements.define('my-page-container', MyPageContainer);
   ```

2. Add route to `src/router/routes.js`:
   ```javascript
   MYPAGE: {
     path: "/mypage",
     componentPath: "mypage/mypage-container",
     componentName: "my-page-container",
     isPublic: false,
     showNav: false,
     showHeader: true,
   }
   ```

3. Navigate to route:
   ```javascript
   import { go } from './router/router-mixin.js';
   import { routes } from './router/routes.js';
   
   go(routes.MYPAGE.path);
   ```

### Adding API Calls

Add functions to `src/services/users.js` or create new service file:

```javascript
export function getMyData() {
  return apiFetch('/v1/mydata', 'GET').then(async (r) => {
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  });
}
```

### Styling Components

Each component has its own scoped styles. Use `global-styles.js` for shared styles:

```javascript
import globalStyles from '../../styles/global-styles.js';

class MyComponent extends LitElement {
  static styles = [
    globalStyles,
    css`
      /* Component-specific styles */
      .my-class {
        color: var(--app-primary-color);
      }
    `
  ];
}
```

## CSS Variables

Defined in `index.html`:

```css
--app-primary-color: #292929
--app-white: #f5f5f5
--app-grey: #7e7e7e
--app-light-grey: #d9d9d9
--app-border-radius: 4px
--primary-font-family: system-ui, -apple-system, sans-serif
--box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)
```

## Scripts

- `npm start` - Start development server with hot reload
- `npm run build` - Build production bundle

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| API_URL | Backend API endpoint | http://localhost:8080 |
| APP_URL | Client app URL | https://localhost:8000 |
| DEV_PORT | Dev server port | 8000 |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Dependencies

- **Lit** (2.7.0) - Web components framework
- **path-to-regexp** (6.2.1) - Route matching
- **Webpack** (5.76.2) - Module bundler
- **webpack-dev-server** (4.13.1) - Development server

## Security Considerations

- **HttpOnly Cookies**: Tokens stored in HttpOnly cookies prevent XSS attacks
- **HTTPS Required**: Cookies marked as Secure (requires HTTPS)
- **Device Fingerprinting**: User agent used as device identifier
- **Automatic Logout**: Invalid tokens trigger automatic logout
- **Token Refresh**: Access tokens short-lived, refresh tokens longer

## Extending the Starter

This is a minimal starter. Consider adding:

- Form validation library
- State management (Redux/MobX)
- UI component library
- Testing framework (Jest/Playwright)
- Error boundary handling
- Loading states
- Toast notifications
- Navigation menu
- User profile editing
- Password reset flow
- Admin panel

## License

MIT
