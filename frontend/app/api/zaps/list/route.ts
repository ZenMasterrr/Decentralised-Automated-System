import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    
    return NextResponse.json({
      status: 'success',
      message: 'Zaps list endpoint - localStorage access not available server-side',
      zaps: [],
      note: 'Use test-zap endpoint directly with zap IDs for localStorage zaps'
    });
    
  } catch (error) {
    console.error('Error in zaps list endpoint:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get zaps list',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
