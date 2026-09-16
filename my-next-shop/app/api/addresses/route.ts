import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const id = searchParams.get('id'); // 🌟 단일 주소 조회를 위한 id 파라미터 추가

  // 🔒 로그인 회원(본인 주소만) 또는 관리자만 조회 가능
  const auth = await requireUser(id ? undefined : userId, { allowAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    // 🌟 1. '상세 주소 보기' 클릭 시: 특정 id의 단일 주소만 가져오기
    if (id) {
      const address = await prisma.address.findUnique({
        where: { id: parseInt(id, 10) }
      });

      // 🔒 관리자가 아니면 본인 주소만 볼 수 있습니다. (남의 주소는 '없음'으로 응답)
      if (!address || (!auth.isAdmin && address.userId !== auth.userId)) {
        return NextResponse.json({ success: false, error: '해당 주소를 찾을 수 없습니다.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, address });
    }

    // 2. 기존 로직: 특정 유저(userId)의 모든 주소 목록 가져오기
    if (auth.userId) {
      const addresses = await prisma.address.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ success: true, addresses });
    }

    // userId나 id 둘 다 없는 잘못된 요청일 경우
    return NextResponse.json({ error: '유저 ID 또는 주소 ID가 필요합니다.' }, { status: 400 });

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
      userId: requestedUserId, 
      recipientName, 
      recipientEnglishName, 
      phone, 
      zipCode, 
      address, 
      detailAddress, 
      personalCustomsCode,
      isDefault 
    } = body;

    // 🔒 본인 배송지만 등록/수정 가능 (userId는 로그인 세션 값을 사용)
    const auth = await requireUser(requestedUserId);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    if (!recipientName || !phone || !zipCode || !address || !detailAddress) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 업데이트 로직
    if (id) {
      // 🔒 수정 대상 배송지가 본인 것인지 확인
      const target = await prisma.address.findUnique({ where: { id: parseInt(id) } });
      if (!target || target.userId !== userId) {
        return NextResponse.json({ error: '해당 주소를 찾을 수 없습니다.' }, { status: 404 });
      }

      if (isDefault) {
        // 기존 기본 배송지 해제
        await prisma.address.updateMany({
          where: { userId: userId, isDefault: true },
          data: { isDefault: false }
        });

        // 🌟 기본 배송지가 아닌 다른 모든 주소들의 ID를 모아서 User의 addressId(CSV)에 저장
        const otherAddresses = await prisma.address.findMany({
          where: { 
            userId: userId,
            NOT: { id: parseInt(id) }
          },
          select: { id: true }
        });
        const otherIdsCsv = otherAddresses.map(a => a.id).join(',');
        
        await prisma.user.update({
          where: { id: userId },
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
        where: { userId: userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: userId,
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
          userId: userId,
          NOT: { id: newAddress.id }
        },
        select: { id: true }
      });
      const otherIdsCsv = otherAddresses.map(a => a.id).join(',');

      await prisma.user.update({
        where: { id: userId },
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

  // 🔒 본인 배송지만 삭제 가능
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const target = await prisma.address.findUnique({ where: { id: parseInt(id) } });
    if (!target || target.userId !== auth.userId) {
      return NextResponse.json({ error: '해당 주소를 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.address.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Address DELETE Error:", error);
    return NextResponse.json({ error: '배송지 삭제 실패' }, { status: 500 });
  }
}
