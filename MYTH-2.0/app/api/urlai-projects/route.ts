import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlProjects } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/urlai-projects — List all URL AI projects
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const projects = await db
            .select()
            .from(urlProjects)
            .where(eq(urlProjects.userId, userId))
            .orderBy(desc(urlProjects.updatedAt));

        return NextResponse.json({ success: true, projects });
    } catch (error) {
        console.error('[urlai-projects] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

// POST /api/urlai-projects — Create a new URL AI project
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, sourceUrl, sandboxId, files } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const id = crypto.randomUUID();
        const now = new Date();

        const [newProject] = await db.insert(urlProjects).values({
            id,
            userId,
            name,
            sourceUrl: sourceUrl || null,
            sandboxId: sandboxId || null,
            files: files || null,
            currentVersion: 1,
            createdAt: now,
            updatedAt: now,
        }).returning();

        console.log(`[urlai-projects] Created "${name}" (${id})`);
        return NextResponse.json({ success: true, project: newProject });
    } catch (error) {
        console.error('[urlai-projects] POST error:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
