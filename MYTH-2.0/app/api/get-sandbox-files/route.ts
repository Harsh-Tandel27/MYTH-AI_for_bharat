import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import { parseJavaScriptFile, buildComponentTree } from '@/lib/file-parser';
import { FileManifest, FileInfo, RouteInfo } from '@/types/file-manifest';
import type { SandboxState } from '@/types/sandbox';

declare global {
  var activeSandbox: any;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sandboxId = searchParams.get('sandboxId');
    const type = searchParams.get('type') || 'frontend'; // frontend, backend, admin

    if (!sandboxId) {
      return NextResponse.json({
        success: false,
        error: 'Sandbox ID is required'
      }, { status: 400 });
    }

    console.log(`[get-sandbox-files] Connecting to sandbox ${sandboxId} (${type})...`);
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

    // Base directory based on layer type
    const baseDir = type === 'backend' ? '/home/user/backend' : '/home/user/app';

    // Get all relevant files
    const result = await sandbox.runCode(`
import os
import json

def get_files_content(directory='${baseDir}', extensions=['.jsx', '.js', '.tsx', '.ts', '.css', '.json', '.env', '.html', '.md']):
    files_content = {}
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and other unwanted directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
        
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, '${baseDir}')
                
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                        # Increased limit for better persistence
                        if len(content) < 50000:
                            files_content[relative_path] = content
                except:
                    pass
    
    return files_content

# Get the files
files_dict = get_files_content()

# Also get the directory structure
structure = []
for root, dirs, dir_files in os.walk('${baseDir}'):
    level = root.replace('${baseDir}', '').count(os.sep)
    indent = ' ' * 2 * level
    structure.append(f"{indent}{os.path.basename(root)}/")
    sub_indent = ' ' * 2 * (level + 1)
    for file in dir_files:
        if not any(skip in root for skip in ['node_modules', '.git', 'dist', 'build']):
            structure.append(f"{sub_indent}{file}")

result = {
    'files': files_dict,
    'structure': '\\n'.join(structure[:50])  # Limit structure to 50 lines
}

print(json.dumps(result))
    `);

    const output = result.logs.stdout.join('');
    const parsedResult = JSON.parse(output);

    // Build enhanced file manifest
    const fileManifest: FileManifest = {
      files: {},
      routes: [],
      componentTree: {},
      entryPoint: '',
      styleFiles: [],
      timestamp: Date.now(),
    };

    // Process each file
    for (const [relativePath, content] of Object.entries(parsedResult.files)) {
      const fullPath = `${baseDir}/${relativePath}`;

      // Create base file info
      const fileInfo: FileInfo = {
        content: content as string,
        type: 'utility',
        path: fullPath,
        relativePath,
        lastModified: Date.now(),
      };

      // Parse JavaScript/JSX files
      if (relativePath.match(/\.(jsx?|tsx?)$/)) {
        const parseResult = parseJavaScriptFile(content as string, fullPath);
        Object.assign(fileInfo, parseResult);

        // Identify entry point
        if (relativePath === 'src/main.jsx' || relativePath === 'src/index.jsx') {
          fileManifest.entryPoint = fullPath;
        }

        // Identify App.jsx
        if (relativePath === 'src/App.jsx' || relativePath === 'App.jsx') {
          fileManifest.entryPoint = fileManifest.entryPoint || fullPath;
        }
      }

      // Track style files
      if (relativePath.endsWith('.css')) {
        fileManifest.styleFiles.push(fullPath);
        fileInfo.type = 'style';
      }

      fileManifest.files[fullPath] = fileInfo;
    }

    // Build component tree
    fileManifest.componentTree = buildComponentTree(fileManifest.files);

    // Extract routes (simplified - looks for Route components or page pattern)
    fileManifest.routes = extractRoutes(fileManifest.files);

    // Update global file cache with manifest
    if (global.sandboxState?.fileCache) {
      global.sandboxState.fileCache.manifest = fileManifest;
    }

    return NextResponse.json({
      success: true,
      files: parsedResult.files,
      structure: parsedResult.structure,
      fileCount: Object.keys(parsedResult.files).length,
      manifest: fileManifest,
    });

  } catch (error) {
    console.error('[get-sandbox-files] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

function extractRoutes(files: Record<string, FileInfo>): RouteInfo[] {
  const routes: RouteInfo[] = [];

  // Look for React Router usage
  for (const [path, fileInfo] of Object.entries(files)) {
    if (fileInfo.content.includes('<Route') || fileInfo.content.includes('createBrowserRouter')) {
      // Extract route definitions (simplified)
      const routeMatches = fileInfo.content.matchAll(/path=["']([^"']+)["'].*(?:element|component)={([^}]+)}/g);

      for (const match of routeMatches) {
        const [, routePath, componentRef] = match;
        routes.push({
          path: routePath,
          component: path,
        });
      }
    }

    // Check for Next.js style pages
    if (fileInfo.relativePath.startsWith('pages/') || fileInfo.relativePath.startsWith('src/pages/')) {
      const routePath = '/' + fileInfo.relativePath
        .replace(/^(src\/)?pages\//, '')
        .replace(/\.(jsx?|tsx?)$/, '')
        .replace(/index$/, '');

      routes.push({
        path: routePath,
        component: path,
      });
    }
  }

  return routes;
}