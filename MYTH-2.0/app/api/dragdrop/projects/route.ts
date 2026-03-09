import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dragdropProjects } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET /api/dragdrop/projects — list all drag-drop projects for the user
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userProjects = await db
            .select()
            .from(dragdropProjects)
            .where(eq(dragdropProjects.userId, userId))
            .orderBy(desc(dragdropProjects.updatedAt));

        return NextResponse.json({ success: true, projects: userProjects });
    } catch (error) {
        console.error('[GET /api/dragdrop/projects] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

// POST /api/dragdrop/projects — save a new drag-drop project
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, themeId, sections } = await request.json();

        if (!name || !sections) {
            return NextResponse.json({ error: 'Name and sections are required' }, { status: 400 });
        }

        const id = crypto.randomUUID();
        const now = new Date();

        const [newProject] = await db.insert(dragdropProjects).values({
            id,
            userId,
            name,
            themeId: themeId || 'midnight',
            sections,
            createdAt: now,
            updatedAt: now,
        }).returning();

        return NextResponse.json({ success: true, project: newProject });
    } catch (error) {
        console.error('[POST /api/dragdrop/projects] Error:', error);
        return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
    }
}
