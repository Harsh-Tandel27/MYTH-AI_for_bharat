import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/projects - List all projects for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ 
      success: true, 
      projects: userProjects 
    });
  } catch (error) {
    console.error('[GET /api/projects] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch projects' 
    }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, sourceUrl, sandboxId, files } = body;

    if (!name || !type) {
      return NextResponse.json({ 
        error: 'Name and type are required' 
      }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    // CRITICAL DEBUG: Log what we're receiving and storing
    console.log('[POST /api/projects] Creating project:', {
      id,
      name,
      type,
      hasFiles: !!files,
      filesCount: Array.isArray(files) ? files.length : 0,
      firstFilePath: files?.[0]?.path,
    });

    const [newProject] = await db.insert(projects).values({
      id,
      userId,
      name,
      type,
      sourceUrl: sourceUrl || null,
      sandboxId: sandboxId || null,
      files: files || null, // Store files directly in project
      createdAt: now,
      updatedAt: now,
    }).returning();

    console.log('[POST /api/projects] Created project, returned files:', {
      hasFiles: !!newProject.files,
      filesCount: Array.isArray(newProject.files) ? newProject.files.length : 0,
    });

    return NextResponse.json({ 
      success: true, 
      project: newProject 
    });
  } catch (error) {
    console.error('[POST /api/projects] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create project' 
    }, { status: 500 });
  }
}
