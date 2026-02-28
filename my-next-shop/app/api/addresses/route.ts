import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: '유저 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error("Address GET Error:", error);
    return NextResponse.json({ error: '배송지 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, // 업데이트 시 사용
      userId, 
      recipientName, 
      recipientEnglishName, 
      phone, 
      zipCode, 
      address, 
      detailAddress, 
      personalCustomsCode,
      isDefault 
    } = body;

    if (!userId || !recipientName || !phone || !zipCode || !address || !detailAddress) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 업데이트 로직
    if (id) {
      if (isDefault) {
        // 기존 기본 배송지 해제
        await prisma.address.updateMany({
          where: { userId: parseInt(userId), isDefault: true },
          data: { isDefault: false }
        });

        // 🌟 기본 배송지가 아닌 다른 모든 주소들의 ID를 모아서 User의 addressId(CSV)에 저장
        const otherAddresses = await prisma.address.findMany({
          where: { 
            userId: parseInt(userId),
            NOT: { id: parseInt(id) }
          },
          select: { id: true }
        });
        const otherIdsCsv = otherAddresses.map(a => a.id).join(',');
        
        await prisma.user.update({
          where: { id: parseInt(userId) },
          data: { 
            defaultAddressId: parseInt(id),
            addressId: otherIdsCsv
          }
        });
      }

      const updatedAddress = await prisma.address.update({
        where: { id: parseInt(id) },
        data: {
          recipientName,
          recipientEnglishName,
          phone,
          zipCode,
          address,
          detailAddress,
          personalCustomsCode,
          isDefault: isDefault ?? undefined
        }
      });

      return NextResponse.json({ success: true, address: updatedAddress, mode: 'update' });
    }

    // 2. 생성 로직
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: parseInt(userId), isDefault: true },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: parseInt(userId),
        recipientName,
        recipientEnglishName,
        phone,
        zipCode,
        address,
        detailAddress,
        personalCustomsCode,
        isDefault: isDefault || false
      }
    });

    if (isDefault) {
      // 🌟 기본 배송지가 아닌 다른 모든 주소들의 ID를 모아서 User의 addressId(CSV)에 저장
      const otherAddresses = await prisma.address.findMany({
        where: { 
          userId: parseInt(userId),
          NOT: { id: newAddress.id }
        },
        select: { id: true }
      });
      const otherIdsCsv = otherAddresses.map(a => a.id).join(',');

      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { 
          defaultAddressId: newAddress.id,
          addressId: otherIdsCsv
        }
      });
    }

    return NextResponse.json({ success: true, address: newAddress, mode: 'create' });

  } catch (error) {
    console.error("Address POST Error:", error);
    return NextResponse.json({ error: '배송지 저장 실패' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '배송지 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    await prisma.address.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Address DELETE Error:", error);
    return NextResponse.json({ error: '배송지 삭제 실패' }, { status: 500 });
  }
}
