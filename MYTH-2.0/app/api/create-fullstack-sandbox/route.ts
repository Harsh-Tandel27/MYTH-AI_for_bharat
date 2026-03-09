import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import { createUniqueDatabase } from '@/lib/mongodb-manager';

// Store active sandboxes globally
declare global {
  var fullstackSandboxes: Map<string, { frontend: any; backend: any; database: any }>;
}

if (!global.fullstackSandboxes) {
  global.fullstackSandboxes = new Map();
}

export async function POST(req: NextRequest) {
  let frontendSandbox: any = null;
  let backendSandbox: any = null;

  try {
    const { type = 'both', sessionId: existingSessionId } = await req.json().catch(() => ({ type: 'both' }));
    const sessionId = existingSessionId || `session_${Date.now()}`;

    console.log(`[create-fullstack-sandbox] Type: ${type}, Session: ${sessionId}`);

    // Get or initialize session state
    let session = global.fullstackSandboxes.get(sessionId) || { frontend: null, backend: null, database: null };

    // ============= BACKEND SANDBOX =============
    if (type === 'backend' || type === 'both') {
      console.log('[Backend Sandbox] Creating Node.js + Express environment...');
      backendSandbox = await Sandbox.create({
        apiKey: process.env.E2B_API_KEY,
        timeoutMs: 900000 // 15 minutes
      });

      // Generate MongoDB configuration
      const projectId = `proj_${Date.now()}`;
      const dbConfig = await createUniqueDatabase(projectId);

      // Setup backend (Node.js + Express + MongoDB)
      const backendSetupCode = `
import subprocess
import os
import json

os.chdir('/home/user')
os.makedirs('backend', exist_ok=True)
os.chdir('/home/user/backend')

# Create package.json
package_json = {
    "name": "myth-backend",
    "version": "1.0.0",
    "type": "module",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js"
    },
    "dependencies": {
        "express": "^4.18.2",
        "mongoose": "^8.0.0",
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "nodemon": "^3.0.1"
    }
}

with open('package.json', 'w') as f:
    json.dump(package_json, f, indent=2)

print('✓ package.json created')

# Create .env file with MongoDB credentials
env_content = f"""# MongoDB Configuration
MONGO_URI=${dbConfig.connectionString}
MONGODB_URI=${dbConfig.connectionString}
PORT=3001
NODE_ENV=development"""

with open('.env', 'w') as f:
    f.write(env_content)

print('✓ .env created with MongoDB connection')

# Create server.js
server_js = """import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected successfully'))
  .catch(err => console.error('✗ MongoDB connection error:', err));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// DEFAULT API RESPONSE (Will be replaced by generated code)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MYTH Backend API Ready',
    version: '1.0.0',
    endpoints: ['/health', '/api']
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`✓ Backend server running on port \${PORT}\`);
});"""

with open('server.js', 'w') as f:
    f.write(server_js)

print('✓ server.js created')

# Create directories
os.makedirs('models', exist_ok=True)
os.makedirs('routes', exist_ok=True)
os.makedirs('controllers', exist_ok=True)
print('✓ models/, routes/, controllers/ created')

# Install dependencies (Minimal)
print('Installing basic backend dependencies...')
subprocess.run(['npm', 'install'], check=True, capture_output=True, text=True)
print('✓ Backend dependencies installed')

# Start server in BACKGROUND
print('Starting background dev server...')
subprocess.Popen(['npm', 'run', 'dev'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print('✓ Background server triggered')
`;

      const backendResult = await backendSandbox.runCode(backendSetupCode, { timeout: 90000 });
      console.log('[Backend Sandbox] Setup complete');

      session.backend = backendSandbox;
      session.database = dbConfig;
    }

    // ============= FRONTEND SANDBOX =============
    if (type === 'frontend' || type === 'both') {
      console.log('[Frontend Sandbox] Creating Vite + React environment...');
      frontendSandbox = await Sandbox.create({
        apiKey: process.env.E2B_API_KEY,
        timeoutMs: 900000 // 15 minutes (Increased from 90s to prevent 404 timeout errors)
      });

      const frontendSetupCode = `
import subprocess
import os

os.chdir('/home/user')
os.makedirs('app', exist_ok=True)
os.chdir('/home/user/app')

# Create package.json
package_json = """{
  "name": "myth-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-router-dom": "^6.21.0",
    "react-icons": "^5.0.0",
    "lucide-react": "^0.263.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.8"
  }
}"""

with open('package.json', 'w') as f: f.write(package_json)

# Vite, Tailwind, PostCSS Configs
vite_config = "import { defineConfig } from 'vite'\\nimport react from '@vitejs/plugin-react'\\nexport default defineConfig({ plugins: [react()], server: { host: '0.0.0.0', port: 5173, strictPort: true, hmr: false, allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'] } })"
with open('vite.config.js', 'w') as f: f.write(vite_config)

tailwind_config = "export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [], }"
with open('tailwind.config.js', 'w') as f: f.write(tailwind_config)

postcss_config = "export default { plugins: { tailwindcss: {}, autoprefixer: {}, }, }"
with open('postcss.config.js', 'w') as f: f.write(postcss_config)

# HTML
html_content = "<!doctype html><html lang='en'><head><meta charset='UTF-8'/><meta name='viewport' content='width=device-width, initial-scale=1.0'/><title>MYTH App</title></head><body><div id='root'></div><script type='module' src='/src/main.jsx'></script></body></html>"
with open('index.html', 'w') as f: f.write(html_content)

os.makedirs('src', exist_ok=True)
# Main Entry Point - BrowserRouter wraps App for react-router-dom support
main_jsx = "import React from 'react'\\nimport ReactDOM from 'react-dom/client'\\nimport { BrowserRouter } from 'react-router-dom'\\nimport App from './App'\\nimport './index.css'\\nReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)"
with open('src/main.jsx', 'w') as f: f.write(main_jsx)

# Placeholder App
app_jsx = "function App() { return <div className='min-h-screen bg-black text-white flex items-center justify-center p-4'><h1>Frontend Ready</h1></div> }\\nexport default App"
with open('src/App.jsx', 'w') as f: f.write(app_jsx)

# CSS
index_css = "@tailwind base;\\n@tailwind components;\\n@tailwind utilities;"
with open('src/index.css', 'w') as f: f.write(index_css)

# Install
print('Installing frontend dependencies...')
subprocess.run(['npm', 'install'], check=True, capture_output=True)
print('✓ Frontend dependencies installed')

# Start server in BACKGROUND
print('Starting background Vite server...')
subprocess.Popen(['npm', 'run', 'dev'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print('✓ Background server triggered')
`;

      const frontendResult = await frontendSandbox.runCode(frontendSetupCode, { timeout: 90000 });
      console.log('[Frontend Sandbox] Setup complete');

      session.frontend = frontendSandbox;
    }

    // Save session
    global.fullstackSandboxes.set(sessionId, session);

    return NextResponse.json({
      success: true,
      sessionId,
      frontend: session.frontend ? {
        sandboxId: session.frontend.sandboxId,
        url: `https://${session.frontend.getHost(5173)}`,
      } : null,
      backend: session.backend ? {
        sandboxId: session.backend.sandboxId,
        url: `https://${session.backend.getHost(3001)}`,
        apiEndpoint: `https://${session.backend.getHost(3001)}/api`,
      } : null,
      database: session.database ? {
        name: session.database.name,
        connectionString: session.database.connectionString,
        createdAt: session.database.createdAt,
      } : null,
    });

  } catch (error: any) {
    console.error('[create-fullstack-sandbox] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
