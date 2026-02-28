import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const { id, name, phone, nickname, personalCustomsCode, zipCode, address, detailAddress, defaultAddressId } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '유저 ID가 필요합니다.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phone,
        nickname,
        personalCustomsCode,
        zipCode,
        address,
        detailAddress,
        defaultAddressId: defaultAddressId ? parseInt(defaultAddressId) : undefined,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: '프로필 업데이트 실패' }, { status: 500 });
  }
}
