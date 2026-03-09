import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { urlProjects, urlProjectVersions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// POST — Restore a specific version
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const { versionId } = await request.json();
        if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

        const [project] = await db.select().from(urlProjects).where(eq(urlProjects.id, id));
        if (!project || project.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const [version] = await db.select().from(urlProjectVersions)
            .where(and(eq(urlProjectVersions.id, versionId), eq(urlProjectVersions.projectId, id)));
        if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

        await db.update(urlProjects).set({ files: version.files, updatedAt: new Date() }).where(eq(urlProjects.id, id));

        return NextResponse.json({ success: true, version: version.version, files: version.files, packages: version.packages });
    } catch (error) {
        console.error('[urlai-restore] POST error:', error);
        return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
    }
}
