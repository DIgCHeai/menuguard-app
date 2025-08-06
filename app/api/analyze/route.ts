import { NextResponse } from 'next/server';
import { AnalysisInputType } from '@/types/types';

export async function POST(request: Request) {
  try {
    const { menuText, inputType, allergies, preferences } = await request.json();
    if (!menuText || !inputType) {
      return NextResponse.json({ error: 'Menu text and input type are required' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Analysis endpoint (placeholder)' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}