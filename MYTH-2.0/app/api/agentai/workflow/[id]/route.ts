import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectMongoDB from '@/lib/mongodb';
import Workflow from '@/lib/models/workflow.model';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const workflow = await Workflow.findOne({ _id: id, userId }).lean();

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    console.log('[Workflow Load] Loaded workflow:', id);

    return NextResponse.json({
      success: true,
      workflow: {
        id: (workflow as any)._id.toString(),
        name: workflow.name,
        flowData: workflow.flowData,
        promptHistory: workflow.promptHistory,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      },
    });

  } catch (error) {
    console.error('[Workflow Load] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const result = await Workflow.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    console.log('[Workflow Delete] Deleted workflow:', id);

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted',
    });

  } catch (error) {
    console.error('[Workflow Delete] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
