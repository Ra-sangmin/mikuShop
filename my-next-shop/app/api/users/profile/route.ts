import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

export async function PUT(request: Request) {
  try {
    const { id, name, phone, nickname, personalCustomsCode, zipCode, address, detailAddress, defaultAddressId } = await request.json();

    // 🔒 본인만 수정 가능
    const auth = await requireUser(id);
    if (!auth.ok) return auth.response;

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
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
      omit: { password: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: '프로필 업데이트 실패' }, { status: 500 });
  }
}
