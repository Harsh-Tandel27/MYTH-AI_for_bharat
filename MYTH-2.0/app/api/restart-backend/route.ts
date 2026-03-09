import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
    try {
        const { sandboxId, action = 'restart' } = await req.json();

        if (!sandboxId) {
            return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 });
        }

        console.log(`[restart-backend] Connecting to sandbox: ${sandboxId}, action: ${action}`);
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

        if (action === 'install') {
            console.log('[restart-backend] Running npm install...');
            const result = await sandbox.runCode(`
import subprocess
import os

os.chdir('/home/user/backend')
print("Running npm install in /home/user/backend...")
result = subprocess.run(['npm', 'install'], capture_output=True, text=True, cwd='/home/user/backend', timeout=60)
print(f"npm install exit code: {result.returncode}")
if result.stdout:
    # Only print last 10 lines to keep it concise
    lines = result.stdout.strip().split('\\n')
    for line in lines[-10:]:
        print(line)
if result.returncode != 0 and result.stderr:
    print(f"npm install ERRORS:\\n{result.stderr}")
`, { timeoutMs: 90000 });

            const logs = result.logs?.stdout?.map((l: any) => l.line || l).join('\n') ||
                (result as any).text ||
                JSON.stringify(result);
            console.log('[restart-backend] npm install result:', logs);
            return NextResponse.json({ success: true, logs });
        }

        if (action === 'restart') {
            console.log('[restart-backend] Killing existing processes and restarting...');

            const result = await sandbox.runCode(`
import subprocess
import time
import os

os.chdir('/home/user/backend')

# Kill any existing node/nodemon processes
subprocess.run(['pkill', '-f', 'nodemon'], capture_output=True)
subprocess.run(['pkill', '-f', 'node server'], capture_output=True)
time.sleep(2)

# Verify they're dead
ps_result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
node_procs = [l for l in ps_result.stdout.split('\\n') if 'node' in l and 'grep' not in l]
print(f"Active node processes after kill: {len(node_procs)}")
for p in node_procs:
    print(f"  {p.strip()}")

# Check if server.js exists
if not os.path.exists('/home/user/backend/server.js'):
    print("ERROR: server.js does not exist!")
    # List files to help debug
    files = os.listdir('/home/user/backend')
    print(f"Files in /home/user/backend: {files}")
else:
    print("server.js found, starting server...")
    
    # Start the server
    env = os.environ.copy()
    env['PORT'] = '3001'
    
    process = subprocess.Popen(
        ['node', 'server.js'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd='/home/user/backend',
        env=env
    )
    
    # Wait a few seconds for startup
    time.sleep(4)
    
    # Check if process is still alive
    poll = process.poll()
    if poll is not None:
        stdout = process.stdout.read().decode('utf-8', errors='replace')
        stderr = process.stderr.read().decode('utf-8', errors='replace')
        print(f"SERVER CRASHED! Exit code: {poll}")
        print(f"STDOUT: {stdout}")
        print(f"STDERR: {stderr}")
    else:
        print(f"Server started successfully with PID: {process.pid}")
        
        # Try to read any early output
        import select
        if select.select([process.stdout], [], [], 0.5)[0]:
            early_output = process.stdout.read1(4096).decode('utf-8', errors='replace')
            print(f"Server output: {early_output}")
        if select.select([process.stderr], [], [], 0.5)[0]:
            early_err = process.stderr.read1(4096).decode('utf-8', errors='replace')
            print(f"Server stderr: {early_err}")
    
    # Check if port 3001 is listening
    time.sleep(1)
    ss_result = subprocess.run(['ss', '-tlnp'], capture_output=True, text=True)
    port_lines = [l for l in ss_result.stdout.split('\\n') if '3001' in l]
    if port_lines:
        print(f"Port 3001 is LISTENING: {port_lines[0].strip()}")
    else:
        print("WARNING: Port 3001 is NOT listening!")
        print(f"All listening ports: {ss_result.stdout}")

    # Quick local health check
    try:
        import urllib.request
        response = urllib.request.urlopen('http://localhost:3001/health', timeout=5)
        print(f"Local health check: {response.status} - {response.read().decode()}")
    except Exception as e:
        print(f"Local health check FAILED: {e}")
`, { timeoutMs: 30000 });

            const logs = result.logs?.stdout?.map((l: any) => l.line || l).join('\n') ||
                (result as any).text ||
                JSON.stringify(result);

            console.log('[restart-backend] Result:', logs);

            return NextResponse.json({
                success: true,
                logs,
                message: 'Backend server restart completed'
            });
        }

        if (action === 'diagnose') {
            const result = await sandbox.runCode(`
import subprocess
import os

print("=== FILE CHECK ===")
os.chdir('/home/user/backend')
files = os.listdir('.')
print(f"Files: {files}")

print("\\n=== PACKAGE.JSON ===")
if os.path.exists('package.json'):
    with open('package.json') as f:
        print(f.read())

print("\\n=== .ENV ===")
if os.path.exists('.env'):
    with open('.env') as f:
        print(f.read())

print("\\n=== SERVER.JS (first 30 lines) ===")
if os.path.exists('server.js'):
    with open('server.js') as f:
        lines = f.readlines()[:30]
        print(''.join(lines))

print("\\n=== PROCESSES ===")
ps = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
for line in ps.stdout.split('\\n'):
    if 'node' in line.lower():
        print(line.strip())

print("\\n=== PORTS ===")
ss = subprocess.run(['ss', '-tlnp'], capture_output=True, text=True)
print(ss.stdout)
`, { timeoutMs: 15000 });

            const logs = result.logs?.stdout?.map((l: any) => l.line || l).join('\n') ||
                (result as any).text ||
                JSON.stringify(result);

            return NextResponse.json({ success: true, logs });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[restart-backend] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
