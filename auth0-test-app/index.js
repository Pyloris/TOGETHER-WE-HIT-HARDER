require('dotenv').config();
const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { ManagementClient } = require('auth0');

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * INITIALIZE MANAGEMENT API CLIENT
 * Note: This requires a Machine-to-Machine (M2M) application 
 * authorized for the Auth0 Management API with 'update:users' scope.
 */
let management;
try {
    management = new ManagementClient({
        domain: process.env.ISSUER_BASE_URL.replace('https://', ''),
        clientId: process.env.MGMT_CLIENT_ID || process.env.CLIENT_ID,
        clientSecret: process.env.MGMT_CLIENT_SECRET,
    });
} catch (err) {
    console.error('Failed to initialize Management API client:', err.message);
}

// Auth0 configuration
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SECRET,
    baseURL: process.env.BASE_URL,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: process.env.ISSUER_BASE_URL,
};

// Apply the auth middleware
app.use(auth(config));

// Helper to check if M2M is configured
const isM2MConfigured = () => {
    return process.env.MGMT_CLIENT_ID && process.env.MGMT_CLIENT_SECRET;
};

// Common CSS for both pages
const commonCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  :root {
    --primary: #6366f1;
    --primary-hover: #4f46e5;
    --bg: #0f172a;
    --card-bg: rgba(30, 41, 59, 0.7);
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --border: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.05);
  }

  body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: radial-gradient(circle at top right, #1e1b4b, #0f172a);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .container {
    width: 100%;
    max-width: 600px;
    padding: 2rem;
    box-sizing: border-box;
  }

  .glass-card {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    padding: 2.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.6s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .profile-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .profile-pic {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 4px solid var(--primary);
    padding: 4px;
    margin-bottom: 1.5rem;
    transition: transform 0.3s ease;
    object-fit: cover;
  }

  .profile-pic:hover {
    transform: scale(1.05);
  }

  h1 {
    font-weight: 700;
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(to right, #818cf8, #c084fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p.subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .status {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 2rem;
  }

  .logged-in { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
  .logged-out { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

  .form-group {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: white;
    font-size: 1rem;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  .btn {
    display: block;
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    text-decoration: none;
    box-sizing: border-box;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    border: 1px solid var(--border);
    margin-top: 1rem;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .alert {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    font-size: 0.875rem;
    text-align: left;
  }

  .alert-warning {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  .alert-success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  pre {
    text-align: left;
    margin-top: 2rem;
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 1.5rem;
    border-radius: 16px;
    color: #6ee7b7;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  nav {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  nav a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
  }

  nav a:hover {
    text-decoration: underline;
  }
`;

// Home route
app.get('/', (req, res) => {
    const isAuthenticated = req.oidc.isAuthenticated();
    const user = req.oidc.user;

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome | Auth0 Express</title>
      <style>${commonCSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="glass-card" style="text-align: center;">
          <h1>Auth0 Express</h1>
          <p class="subtitle">Secure authentication with a premium experience</p>
          
          <div class="status ${isAuthenticated ? 'logged-in' : 'logged-out'}">
            ${isAuthenticated ? '● Connected' : '○ Disconnected'}
          </div>

          ${isAuthenticated
            ? `
              <div class="profile-header">
                <img src="${user.picture}" class="profile-pic" alt="Profile" />
                <h2>Welcome back, ${user.name || user.nickname}!</h2>
              </div>
              <a href="/profile" class="btn">View & Edit Profile</a>
              <a href="/logout" class="btn btn-secondary">Logout</a>
            `
            : `
              <div style="margin: 2rem 0;">
                <p style="color: var(--text-muted);">Please sign in to access your secure profile and testing settings.</p>
              </div>
              <a href="/login" class="btn">Login with Auth0</a>
            `
        }
        </div>
      </div>
    </body>
    </html>
  `);
});

// Protected profile route
app.get('/profile', requiresAuth(), (req, res) => {
    const user = req.oidc.user;
    const error = req.query.error;
    const success = req.query.success;

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profile Settings | Auth0 Express</title>
      <style>${commonCSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="glass-card">
          <div class="profile-header">
            <img src="${user.picture}" class="profile-pic" alt="Profile" />
            <h1>Profile Settings</h1>
            <p class="subtitle">Update your real account details in Auth0</p>
          </div>

          ${!isM2MConfigured() ? `
            <div class="alert alert-warning">
              <strong>Configuration Required:</strong> 
              Please add <code>MGMT_CLIENT_ID</code> and <code>MGMT_CLIENT_SECRET</code> to your <code>.env</code> file to enable real-time updates to the Auth0 portal.
            </div>
          ` : ''}

          ${error ? `<div class="alert alert-warning" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Error: ${error}</div>` : ''}
          ${success ? `<div class="alert alert-success">✓ Profile updated successfully in Auth0! Note: It may take a minute to reflect in the portal.</div>` : ''}

          <form action="/update-profile" method="POST">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" value="${user.name || ''}" placeholder="Enter your name" ${!isM2MConfigured() ? 'disabled' : ''}>
            </div>
            <div class="form-group">
              <label for="picture">Profile Picture URL</label>
              <input type="url" id="picture" name="picture" value="${user.picture || ''}" placeholder="https://example.com/avatar.png" ${!isM2MConfigured() ? 'disabled' : ''}>
              <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem;">
                Try Gravatar, Unsplash, or any image URL.
              </p>
            </div>
            <button type="submit" class="btn" ${!isM2MConfigured() ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              Save to Auth0
            </button>
          </form>

          <a href="/" class="btn btn-secondary">← Back to Home</a>

          <h3 style="margin-top: 3rem; font-size: 0.875rem; color: var(--text-muted);">Current ID Token Claims</h3>
          <pre>${JSON.stringify(user, null, 2)}</pre>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Update profile route
app.post('/update-profile', requiresAuth(), async (req, res) => {
    if (!isM2MConfigured()) {
        return res.redirect('/profile?error=Management API not configured');
    }

    const { name, picture } = req.body;
    const sub = req.oidc.user.sub;

    console.log('Updating Auth0 User:', sub);
    console.log('New Name:', name);
    console.log('New Picture:', picture);

    try {
        // Update the user record in Auth0
        // In recent versions of the SDK, the first argument is often the ID string
        await management.users.update(
            sub,
            {
                name: name,
                picture: picture,
                user_metadata: {
                    updated_via_app: true,
                    display_name: name
                }
            }
        );

        console.log(`Successfully updated user: ${sub}`);
        res.redirect('/profile?success=true');
    } catch (err) {
        console.error('Auth0 Update Error:', err.message);
        res.redirect(`/profile?error=${encodeURIComponent(err.message)}`);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});