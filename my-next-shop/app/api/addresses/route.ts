import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { isValidNameEnglish, normalizeNameEnglish } from '@/lib/japanAddress';

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

    // 🔤 영문 수취인명도 필수입니다. 일본 쇼핑몰·창고는 한글을 읽지 못해
    //    비어 있으면 현지에서 소포 주인을 가릴 수 없고 배송이 지연됩니다.
    //    화면에서도 막지만, 화면을 거치지 않는 요청이 빈 값을 넣지 못하도록 여기서도 확인합니다.
    const trimmedEnglishName = String(recipientEnglishName ?? '').trim();
    if (!trimmedEnglishName) {
      return NextResponse.json({ error: '수취인명(영문)을 입력해주세요.' }, { status: 400 });
    }
    if (!isValidNameEnglish(trimmedEnglishName)) {
      return NextResponse.json({ error: '수취인명(영문)은 영문·공백·하이픈만 사용할 수 있습니다.' }, { status: 400 });
    }
    const normalizedEnglishName = normalizeNameEnglish(trimmedEnglishName);

    // 1. 업데이트 로직
    if (id) {
      // 🔒 수정 대상 배송지가 본인 것인지 확인
      const target = await prisma.address.findUnique({ where: { id: parseInt(id) } });
      if (!target || target.userId !== userId) {
        return NextResponse.json({ error: '해당 주소를 찾을 수 없습니다.' }, { status: 404 });
      }

      if (isDefault) {
        // 기본 배송지는 addresses.isDefault 하나로만 표시합니다.
        // 예전에는 users.defaultAddressId·addressId(CSV)에도 같은 사실을 써 두었는데,
        // 한쪽만 갱신되면 화면과 알림톡이 서로 다른 배송지를 가리켰습니다.
        await prisma.address.updateMany({
          where: { userId: userId, isDefault: true },
          data: { isDefault: false }
        });
      }

      const updatedAddress = await prisma.address.update({
        where: { id: parseInt(id) },
        data: {
          recipientName,
          recipientEnglishName: normalizedEnglishName,
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
        recipientEnglishName: normalizedEnglishName,
        phone,
        zipCode,
        address,
        detailAddress,
        personalCustomsCode,
        isDefault: isDefault || false
      }
    });

    // 기본 배송지 표시는 위에서 끝났습니다. (addresses.isDefault 한 곳으로만 관리)

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
