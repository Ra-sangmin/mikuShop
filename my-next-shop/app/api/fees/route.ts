import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const fees = await prisma.feeConfiguration.findMany();
    return NextResponse.json({ success: true, fees });
  } catch (error) {
    return NextResponse.json({ success: false, error: '수수료 로드 실패' }, { status: 500 });
  }
}