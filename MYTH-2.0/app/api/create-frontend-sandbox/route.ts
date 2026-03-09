import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

// Store active sandboxes globally
declare global {
    var fullstackSandboxes: Map<string, { frontend: any; backend: any; database: any }>;
}

if (!global.fullstackSandboxes) {
    global.fullstackSandboxes = new Map();
}

export async function POST(req: Request) {
    let sandbox: any = null;

    try {
        const { sessionId } = await req.json().catch(() => ({}));

        console.log(`[create-frontend-sandbox] Creating sandbox for session: ${sessionId}`);

        // Get or initialize session state
        let session = global.fullstackSandboxes.get(sessionId) || { frontend: null, backend: null, database: null };

        // Create base sandbox
        sandbox = await Sandbox.create({
            apiKey: process.env.E2B_API_KEY,
            timeoutMs: 900000 // 15 minutes
        });

        const sandboxId = (sandbox as any).sandboxId;
        const host = (sandbox as any).getHost(5173);

        console.log(`[create-frontend-sandbox] Sandbox created: ${sandboxId}`);

        // Set up a basic Vite React app using Python to write files
        const setupScript = `
import os
import json

# Create directory structure
os.makedirs('/home/user/app/src', exist_ok=True)

# Package.json
package_json = {
    "name": "myth-frontend",
    "version": "1.0.0",
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
        "vite": "^5.0.8",
        "tailwindcss": "^3.3.0",
        "postcss": "^8.4.31",
        "autoprefixer": "^10.4.16"
    }
}

with open('/home/user/app/package.json', 'w') as f:
    json.dump(package_json, f, indent=2)

# Vite config
vite_config = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  }
})"""
with open('/home/user/app/vite.config.js', 'w') as f:
    f.write(vite_config)

# Tailwind config
tailwind_config = "export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [], }"
with open('/home/user/app/tailwind.config.js', 'w') as f:
    f.write(tailwind_config)

# PostCSS config
postcss_config = "export default { plugins: { tailwindcss: {}, autoprefixer: {}, }, }"
with open('/home/user/app/postcss.config.js', 'w') as f:
    f.write(postcss_config)

# Index.html
index_html = "<!doctype html><html lang='en'><head><meta charset='UTF-8'/><meta name='viewport' content='width=device-width, initial-scale=1.0'/><title>MYTH App</title></head><body><div id='root'></div><script type='module' src='/src/main.jsx'></script></body></html>"
with open('/home/user/app/index.html', 'w') as f:
    f.write(index_html)

# Main.jsx - BrowserRouter wraps App for react-router-dom support
main_jsx = "import React from 'react'\\nimport ReactDOM from 'react-dom/client'\\nimport { BrowserRouter } from 'react-router-dom'\\nimport App from './App'\\nimport './index.css'\\nReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)"
with open('/home/user/app/src/main.jsx', 'w') as f:
    f.write(main_jsx)

# App.jsx (Initial Placeholder)
app_jsx = "function App() { return <div className='min-h-screen bg-black text-white flex items-center justify-center'><h1>Frontend Sandbox Initializing...</h1></div> }\\nexport default App"
with open('/home/user/app/src/App.jsx', 'w') as f:
    f.write(app_jsx)

# Index.css
index_css = "@tailwind base;\\n@tailwind components;\\n@tailwind utilities;"
with open('/home/user/app/src/index.css', 'w') as f:
    f.write(index_css)
`;

        await sandbox.runCode(setupScript);

        // Install dependencies
        console.log('[create-frontend-sandbox] Installing npm packages...');
        await sandbox.runCode(`
import subprocess
subprocess.run(['npm', 'install'], cwd='/home/user/app', check=True)
`);

        // Start Vite dev server in background
        console.log('[create-frontend-sandbox] Starting Vite dev server...');
        await sandbox.runCode(`
import subprocess
import os
import time

os.chdir('/home/user/app')

# Kill any existing Vite processes
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
time.sleep(1)

# Start Vite dev server
env = os.environ.copy()
env['FORCE_COLOR'] = '0'

process = subprocess.Popen(
    ['npm', 'run', 'dev'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    env=env
)
print(f'✓ Vite dev server started with PID: {process.pid}')
`);

        // Wait for Vite to be warm
        await new Promise(resolve => setTimeout(resolve, 5000));

        session.frontend = sandbox;
        if (sessionId) global.fullstackSandboxes.set(sessionId, session);

        return NextResponse.json({
            success: true,
            sessionId: sessionId || `session_${Date.now()}`,
            frontend: {
                sandboxId,
                url: `https://${host}`
            },
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
            message: 'Frontend sandbox created and initialized'
        });

    } catch (error: any) {
        console.error('[create-frontend-sandbox] Error:', error);
        if (sandbox) await sandbox.kill().catch(() => { });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
