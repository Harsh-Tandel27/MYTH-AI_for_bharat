import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxState } from '@/types/sandbox';
import { appConfig } from '@/config/app.config';
import { requireCredits, CREDIT_COSTS } from '@/lib/credits';

// Store active sandbox globally
declare global {
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST() {
  let sandbox: any = null;

  try {
    // Deduct credits before creating a sandbox
    const creditResult = await requireCredits(CREDIT_COSTS.SANDBOX_CREATION, 'Sandbox Creation — E2B sandbox provisioned');
    if (creditResult.ok === false) return creditResult.response;

    console.log('[create-ai-sandbox] Creating base sandbox...');

    // Kill existing sandbox if any
    if (global.activeSandbox) {
      console.log('[create-ai-sandbox] Killing existing sandbox...');
      try {
        await global.activeSandbox.kill();
      } catch (e) {
        console.error('Failed to close existing sandbox:', e);
      }
      global.activeSandbox = null;
    }

    // Clear existing files tracking
    if (global.existingFiles) {
      global.existingFiles.clear();
    } else {
      global.existingFiles = new Set<string>();
    }

    // Create base sandbox - we'll set up Vite ourselves for full control
    console.log(`[create-ai-sandbox] Creating base E2B sandbox with ${appConfig.e2b.timeoutMinutes} minute timeout...`);
    sandbox = await Sandbox.create('base', {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: appConfig.e2b.timeoutMs
    });

    const sandboxId = (sandbox as any).sandboxId || Date.now().toString();
    const host = (sandbox as any).getHost(appConfig.e2b.vitePort);

    console.log(`[create-ai-sandbox] Sandbox created: ${sandboxId}`);
    console.log(`[create-ai-sandbox] Sandbox host: ${host}`);

    // Set up a basic Vite React app 
    console.log('[create-ai-sandbox] Setting up Vite React app...');

    await sandbox.commands.run('mkdir -p /home/user/app/src');

    await sandbox.files.write('/home/user/app/package.json', JSON.stringify({
      "name": "sandbox-app",
      "version": "1.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      },
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "framer-motion": "^11.0.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.0"
      },
      "devDependencies": {
        "@vitejs/plugin-react": "^4.0.0",
        "vite": "^4.3.9",
        "tailwindcss": "^3.3.0",
        "postcss": "^8.4.31",
        "autoprefixer": "^10.4.16"
      }
    }, null, 2));

    await sandbox.files.write('/home/user/app/vite.config.js', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// E2B-compatible Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: false,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  }
})`);

    // Tailwind config
    await sandbox.files.write('/home/user/app/tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`);

    // PostCSS config
    await sandbox.files.write('/home/user/app/postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);

    // Index.html
    await sandbox.files.write('/home/user/app/index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
    <script>
      window.addEventListener('error', function(e) {
        window.parent.postMessage({ type: 'CONSOLE_ERROR', message: e.message, source: e.filename, lineno: e.lineno }, '*');
      });
      window.addEventListener('unhandledrejection', function(e) {
        window.parent.postMessage({ type: 'CONSOLE_ERROR', message: e.reason?.message || String(e.reason) }, '*');
      });
      const originalError = console.error;
      console.error = function(...args) {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        window.parent.postMessage({ type: 'CONSOLE_ERROR', message: msg }, '*');
        originalError.apply(console, args);
      };
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`);

    // Main.jsx
    await sandbox.files.write('/home/user/app/src/main.jsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`);

    // App.jsx
    await sandbox.files.write('/home/user/app/src/App.jsx', `function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <p className="text-lg text-gray-400">
          Sandbox Ready<br/>
          Start building your React app with Vite and Tailwind CSS!
        </p>
      </div>
    </div>
  )
}

export default App`);

    // index.css
    await sandbox.files.write('/home/user/app/src/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
}`);

    // Install dependencies replacing runCode with commands
    console.log('[create-ai-sandbox] Installing dependencies...');
    const installObj = await sandbox.commands.run('npm install', { cwd: '/home/user/app' });
    console.log('[create-ai-sandbox] npm install exit code:', installObj.exitCode);
    if (installObj.stderr) {
      console.log('[create-ai-sandbox] npm install stderr:', installObj.stderr);
    }

    // Start Vite dev server in background using commands run
    console.log('[create-ai-sandbox] Starting Vite dev server...');
    // We run it in the background using the & symbol and redirecting output.
    await sandbox.commands.run('npm run dev > /home/user/app/vite.log 2>&1 &', {
      cwd: '/home/user/app',
      env: { FORCE_COLOR: '0' }
    });

    // Wait for Vite to be fully ready by resolving the port explicitly
    console.log('[create-ai-sandbox] Waiting for Vite port 5173...');
    // Simply wait 3 seconds for the background & process to bind to 5173.
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if the URL resolves properly by fetching the localhost check
    const isPortOpen = await sandbox.commands.run('curl -s -f http://localhost:5173 > /dev/null && echo "open" || echo "closed"');
    console.log('[create-ai-sandbox] Port 5173 status:', isPortOpen.stdout);

    // Force Tailwind CSS to rebuild by touching the CSS file using bash
    await sandbox.commands.run('touch /home/user/app/src/index.css');

    // Store sandbox globally
    global.activeSandbox = sandbox;
    global.sandboxData = {
      sandboxId,
      url: `https://${host}`
    };

    // Set extended timeout on the sandbox instance if method available
    if (typeof sandbox.setTimeout === 'function') {
      sandbox.setTimeout(appConfig.e2b.timeoutMs);
      console.log(`[create-ai-sandbox] Set sandbox timeout to ${appConfig.e2b.timeoutMinutes} minutes`);
    }

    // Initialize sandbox state
    global.sandboxState = {
      fileCache: {
        files: {},
        lastSync: Date.now(),
        sandboxId
      },
      sandbox,
      sandboxData: {
        sandboxId,
        url: `https://${host}`
      }
    };

    // Track initial files
    global.existingFiles.add('src/App.jsx');
    global.existingFiles.add('src/main.jsx');
    global.existingFiles.add('src/index.css');
    global.existingFiles.add('index.html');
    global.existingFiles.add('package.json');
    global.existingFiles.add('vite.config.js');
    global.existingFiles.add('tailwind.config.js');
    global.existingFiles.add('postcss.config.js');

    console.log('[create-ai-sandbox] Sandbox ready at:', `https://${host}`);

    return NextResponse.json({
      success: true,
      sandboxId,
      url: `https://${host}`,
      message: 'Sandbox created and Vite React app initialized'
    });

  } catch (error) {
    console.error('[create-ai-sandbox] Error:', error);

    // Clean up on error
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch (e) {
        console.error('Failed to close sandbox on error:', e);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}