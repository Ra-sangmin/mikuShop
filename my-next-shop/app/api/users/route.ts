// app/api/users/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: '유저 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        orders: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: '유저를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("User GET Error:", error);
    return NextResponse.json({ error: 'DB 조회 실패' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, cyberMoney, addressId, addressMode } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '유저 ID가 필요합니다.' }, { status: 400 });
    }

    const updateData: any = {};
    if (cyberMoney !== undefined) {
      updateData.cyberMoney = {
        increment: parseInt(cyberMoney) || 0
      };
    }
    if (addressId !== undefined) {
      if (addressMode === 'add') {
        // 🌟 'add' 모드일 때만 기존 address_id 값을 가져와서 새로운 ID를 추가 (콤마로 구분)
        const user: any = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        let currentIds = user?.addressId ? user.addressId.split(',') : [];
        
        const newIdStr = addressId.toString();
        if (!currentIds.includes(newIdStr)) {
          currentIds.push(newIdStr);
        }
        
        updateData.addressId = currentIds.join(',');
      } else {
        // 🌟 'add' 모드가 아닐 때는 그냥 덮어쓰거나 무시 (필요에 따라 수정)
        updateData.addressId = addressId.toString();
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("User PUT Error:", error);
    return NextResponse.json({ error: 'DB 업데이트 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, loginId } = body;

    if (!email || !password || !name || !loginId) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 이메일 중복 체크
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUserByEmail) {
      return NextResponse.json({ success: false, error: '이미 존재하는 이메일입니다.' }, { status: 400 });
    }

    // 로그인 아이디 중복 체크
    const existingUserById = await prisma.user.findUnique({
      where: { loginId: loginId }
    });

    if (existingUserById) {
      return NextResponse.json({ success: false, error: '이미 존재하는 아이디입니다.' }, { status: 400 });
    }

    // 유저 생성
    const newUser = await prisma.user.create({
      data: {
        loginId,
        email,
        password,
        name,
        level: '일반회원',
        cyberMoney: 0
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error("User POST Error:", error);
    return NextResponse.json({ error: '회원가입 처리 중 오류 발생' }, { status: 500 });
  }
}
