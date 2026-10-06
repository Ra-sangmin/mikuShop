import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { requireAdmin, requireUser } from '@/lib/apiAuth';
import { ORDER_STATUS } from '@/src/types/order';
import { generateOrderId, generateBundleId, isDuplicateOrderId } from '@/lib/orderId';
import { translateToKorean } from '@/lib/translate';
import { triggerAdminOrderAlert } from '@/lib/notifications/adminOrderAlertRunner';

// 🟢 [GET] 1. 주문 목록 및 유저 정보 조회
export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        bundleId: true,
        orderId: true,
        productId: true,
        trackingNo: true,
        productImageUrl: true,
        productPrice: true,
        productName: true,
        productUrl: true,
        productOption: true,
        productRequest: true,
        registeredAt: true,
        receivedAt: true,
        shippedAt: true,
        serviceRequest: true,
        status: true,
        deliveryStatus: true,
        // ⚠️ 구매 요청 단계의 일본내 배송료(¥). 배송비 결제 대기 단계 금액은 shippingFee 쪽입니다.
        domesticShippingFee: true, 
        addressId: true,
        shippingFees: {
          select: {
            id: true, round: true,
            intlFeeJpy: true, intlFeeKrw: true,
            domesticFeeJpy: true, domesticFeeKrw: true,
            extraFeeKrw: true, appliedExchangeRate: true,
            memo: true, paidAt: true,
          },
          orderBy: { round: 'asc' },
        },
        bidStatus: true,
        user: {
          omit: { password: true }, // 🔒 비밀번호 해시는 내려보내지 않음
          include: {
            addresses: true 
          }
        },
      },
      orderBy: {
        registeredAt: 'desc', 
      }
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("GET Orders Error:", error);
    return NextResponse.json({ error: '데이터를 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

function parseJapaneseDate(dateStr: string) {
  if (!dateStr) return null;
  
  try {
    // 예: "3月26日（木）15時24分 終了予定" -> 숫자만 추출
    // 정규식 설명: (\d+) 뒤에 각 단위(月, 日, 時, 分)가 오는 패턴을 찾습니다.
    const currentYear = new Date().getFullYear();
    const match = dateStr.match(/(\d+)月\s*(\d+)日.*?\s*(\d+)時\s*(\d+)分/);
    
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const hour = parseInt(match[3], 10);
      const minute = parseInt(match[4], 10);

      // 월은 0부터 시작하므로 (month - 1)
      const date = new Date(currentYear, month - 1, day, hour, minute);
      
      // 만약 생성된 날짜가 현재 시간보다 이전이라면 (예: 12월에 내년 1월 경매를 볼 때)
      // 연도를 다음 해로 넘겨줍니다.
      if (date < new Date()) {
        date.setFullYear(currentYear + 1);
      }
      
      return date;
    }
  } catch (e) {
    console.error("일본어 날짜 파싱 에러:", e);
  }
  return null;
}

// 🔵 [POST] 2. 상품 주문(장바구니) 생성 및 경매 신청
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userId: requestedUserId, 
      productName, 
      productPrice, 
      productCount, 
      domesticShippingFee,
      productImageUrl, 
      productUrl, 
      productOption,
      serviceRequest,
      productRequest,
      status = "CART",
      type,
      auctionEndDate,
      myBidPrice, 
      depositAmount,
    } = body;

    let finalTitle = productName;
    if (!finalTitle) finalTitle = "구매대행 요청 (상품명 추출 불가)";

    // 🈯 상품명은 한국어로 저장합니다. 주문 관리·마이페이지·알림톡이 모두 이 값을 그대로 보여 줍니다.
    //
    //    예전엔 화면이 각자 알아서 한국어를 만들어 보냈습니다. 쇼핑 상세(GlobalProductDetailShop)는
    //    브라우저 구글 번역이 바꿔 놓은 제목을 DOM 에서 긁어 왔고, 경매 상세는 아예 원문을 그대로 보냈습니다.
    //    그래서 플랫폼마다 결과가 달랐습니다 — 라쿠텐은 한국어로, 야후 옥션·야후 쇼핑·메루카리는 일본어로 남았습니다.
    //    보내는 쪽이 아니라 저장하는 이 자리에서 한 번만 맞춥니다.
    //
    //    translateToKorean 은 일본어(히라가나·가타카나)가 없으면 DeepL 을 부르지 않습니다.
    //    구매대행 신청 폼처럼 이미 한국어로 온 이름은 그대로 지나가고 할당량도 쓰지 않습니다.
    //    번역에 실패해도 원문을 돌려주므로(lib/deepl.ts) 주문 생성이 막히지 않습니다.
    finalTitle = await translateToKorean(finalTitle, 100);

    // 🔒 로그인 회원 본인 명의로만 주문 생성 (userId는 세션 값을 사용)
    const auth = await requireUser(requestedUserId);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    if (!productUrl || !productPrice) {
      return NextResponse.json({ error: '필수 정보(유저ID, URL, 가격)가 누락되었습니다.' }, { status: 400 });
    }

    // 🔒 음수 금액·수량 차단
    if (Number(productPrice) <= 0 || Number(depositAmount || 0) < 0 || Number(myBidPrice || 0) < 0 || Number(productCount || 0) < 0) {
      return NextResponse.json({ error: '금액/수량 값이 올바르지 않습니다.' }, { status: 400 });
    }

    // ====================================================================
    // 🌟 사전 검사: 유저 확인 (Fail-Fast)
    // ====================================================================
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        errorCode: 'USER_NOT_FOUND', 
        error: "유저 정보를 찾을 수 없습니다. 다시 로그인 해주세요." 
      }, { status: 401 });
    }

    // 💰 경매 요청은 **신청만** 받습니다. 보증금은 마이페이지에서 '보증금 결제'를 누를 때 카드로 받습니다.
    //    구매대행이 장바구니에 담을 때 돈을 받지 않는 것과 같습니다.
    //    🔒 보증금 금액(엔)은 화면 값이 아니라 입찰가로 서버가 계산해 둡니다. 마이페이지가 이 값으로 청구합니다.
    const isAuctionRequest = status === "BID_PENDING" && Number(myBidPrice) > 0;
    // ====================================================================

    const formattedDate = parseJapaneseDate(auctionEndDate);

    // 🌟 모든 작업을 하나의 트랜잭션으로 묶어 안전하게 처리
    // 🧾 주문번호는 아래 반복문에서 골라 넘깁니다 (lib/orderId.ts — M250918-0001 형식)
    const createOrder = (orderId: string) => prisma.$transaction(async (tx) => {
      
      // 1. 공통 주문 생성 (장바구니, 일반 구매, 경매 상관없이 무조건 1번만 작성!)
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          orderId: orderId,
          type: type || "PURCHASE",
          productName: finalTitle,
          productPrice: Math.round(productPrice),
          // 일반 구매는 입력받은 갯수, 경매는 기본 1개로 처리
          productCount: Number(productCount) || (status === "BID_PENDING" ? 1 : 0), 
          domesticShippingFee: Number(domesticShippingFee) || 0,
          productImageUrl: productImageUrl || "",
          productUrl: productUrl,
          productOption: productOption || "",
          serviceRequest: serviceRequest || "",
          productRequest: productRequest || "",
          auctionEndDate: formattedDate,
          // 🌟 배송대행 신청은 "입고 대기중(WAITING)" 으로 저장합니다. (예전 화면이 PAID 로 보내도 바꿔 저장)
          status: status === "장바구니" ? "CART"
            : (type === "DELIVERY" && (status === "PAID" || status === "WAITING")) ? "WAITING"
            : (status || "CART"),
          
          // 🕒 만들어진 순간이 곧 "그 상태가 된 시각"입니다.
          //    예전에는 여기서 비워 두고 상태를 바꿀 때만 채웠는데, 그러면 배송대행 신청처럼
          //    처음부터 관리자 처리가 필요한 상태(WAITING)로 생긴 주문이
          //    statusChangedAt 이 비어 있어 관리자 알림에서 통째로 빠졌습니다.
          //    (app/api/cron/admin-order-alert 가 이 값으로 새 건을 가려냅니다)
          statusChangedAt: new Date(),

          // 경매가 아니면 null/0이 들어가므로 문제없음
          myBidPrice: Number(myBidPrice) || null,
          // 💰 보증금은 원화로 셉니다. 신청 단계에서는 아직 받지 않았으므로 0 입니다.
          //    필요한 금액은 입찰가(myBidPrice)와 환율로 그때그때 구합니다. (src/utils/auctionDeposit.ts)
          depositAmount: 0, // (옛 컬럼: 엔 기준 보증금 — 더 이상 쓰지 않습니다)
          depositKrw: 0,
        }
      });

      // 2. 💰 경매 요청 단계에서는 돈을 받지 않습니다.
      //    보증금은 마이페이지 '보증금 결제'(BID_PENDING → BIDDING)에서 받습니다. (app/api/orders PUT)

      // 최종적으로 생성된 주문 정보 반환
      return newOrder;
    });

    // 🧾 번호를 고른 직후 다른 요청이 같은 번호를 먼저 쓸 수 있으므로, 겹치면 다시 고릅니다.
    let result: Awaited<ReturnType<typeof createOrder>> | undefined;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const orderId = generateOrderId();
      try {
        result = await createOrder(orderId);
        break;
      } catch (e) {
        if (isDuplicateOrderId(e) && attempt < 5) continue;
        throw e;
      }
    }
    if (!result) throw new Error('주문번호가 계속 겹쳐 주문을 만들지 못했습니다. 잠시 후 다시 시도해주세요.');

    // 🔔 관리자 처리 필요 알림을 바로 보냅니다 (응답 뒤에 실행 — 기다리지 않음)
    triggerAdminOrderAlert();
    return NextResponse.json({ success: true, order: result, productName: finalTitle });

  } catch (error: any) {
    console.error("❌ API Route Fatal Error (POST):", error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "주문 생성 중 서버 에러가 발생했습니다." 
    }, { status: 500 });
  }
}

// 🟡 [PUT] 3. 주문 상태 저장 (포장 요청 · 입찰 상태 등)
//    💳 결제로 넘어가는 상태(상품 결제 완료 · 경매 중 · 배송비 결제 완료 …)는 여기서 바꿀 수 없습니다.
//       카드 승인(app/api/payment/confirm)만 그 상태로 넘깁니다.
const PAYMENT_ONLY_STATUSES: string[] = [
  ORDER_STATUS.PAID, ORDER_STATUS.BID_PAID, ORDER_STATUS.BIDDING, ORDER_STATUS.PAYMENT_DONE,
];

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { updates, type, userId: requestedUserId } = body; 

    // 🔒 로그인 회원 본인의 주문만 변경 가능 (userId는 세션 값을 사용)
    const auth = await requireUser(requestedUserId);
    if (!auth.ok) return auth.response;
    const sessionUserId = auth.userId;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // 🔒 결제 없이 결제 완료 상태로 바꾸는 요청을 막습니다.
    if (type !== 'delivery' && updates.some((o: any) => PAYMENT_ONLY_STATUSES.includes(String(o?.status)))) {
      return NextResponse.json({ error: '결제는 카드 결제 화면에서만 진행할 수 있습니다.' }, { status: 400 });
    }

    // 🔒 변경 대상 주문이 모두 본인 주문인지 확인
    const orderIds = updates.map((o: any) => String(o?.id ?? ''));
    const ownedCount = await prisma.order.count({ where: { orderId: { in: orderIds }, userId: sessionUserId } });
    if (ownedCount !== new Set(orderIds).size || orderIds.some((id: string) => !id)) {
      return NextResponse.json({ error: '본인 주문만 변경할 수 있습니다.' }, { status: 403 });
    }

    // 🧾 합포장 묶음번호도 서버에서 만듭니다. 화면에서 만들면 같은 날 다른 회원의 묶음과 번호가 겹쳐
    //    서로 관계없는 주문이 한 묶음으로 보일 수 있습니다. 화면은 'AUTO' 만 보내고 여기서 채웁니다.
    let generatedBundleId: string | null = null;
    if (updates.some((o: any) => o?.bundleId === 'AUTO')) {
      generatedBundleId = await generateBundleId(prisma);
    }

    // 입고·발송 시각을 이미 찍어 둔 주문은 건드리지 않기 위해 변경 전 값을 읽어 둡니다.
    const previousOrders = new Map<string, { receivedAt: Date | null; shippedAt: Date | null; status?: string }>();
    if (type !== 'delivery') {
      const before = await prisma.order.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, receivedAt: true, shippedAt: true, status: true },
      });
      before.forEach(o => previousOrders.set(o.orderId, { receivedAt: o.receivedAt, shippedAt: o.shippedAt, status: o.status }));
    }

    // ✅ 안전한 인터랙티브 트랜잭션 (모두 성공하거나 자동 롤백)
    await prisma.$transaction(async (tx) => {
      
      // 📦 [주문 업데이트 로직] 디테일한 상태 및 부가 정보 변경
      for (const order of updates) {
        const updateData: any = {};
        
        // 배송 상태 업데이트인지, 일반 주문 상태 업데이트인지 분기 처리
        if (type === 'delivery') {
          updateData.deliveryStatus = order.status;
        } else {
          updateData.status = order.status;

          // 🐛 관리자 라우트와 같은 문제였습니다 — 한글 라벨과 비교해 조건이 참이 되지 않았습니다.
          //    (회원이 직접 이 두 상태로 바꾸는 경로는 없지만, 두 라우트의 규칙을 같게 둡니다)
          //    이미 찍혀 있으면 덮어쓰지 않습니다.
          const previous = previousOrders.get(order.id);
          if (order.status === ORDER_STATUS.ARRIVED && !previous?.receivedAt) updateData.receivedAt = new Date();
          if (order.status === ORDER_STATUS.SHIPPING && !previous?.shippedAt) updateData.shippedAt = new Date();
          // 🕒 상태가 실제로 바뀌었으면 변경 시각을 남깁니다. (관리자 '처리 중 전체' 최근 변경순 정렬)
          if (previous && previous.status !== order.status) updateData.statusChangedAt = new Date();
        }

        if (order.bundleId !== undefined) {
          updateData.bundleId = order.bundleId === 'AUTO' ? generatedBundleId : order.bundleId;
        }
        if (order.trackingNo !== undefined) updateData.trackingNo = order.trackingNo;
        if (order.address_id !== undefined) updateData.addressId = order.address_id ? parseInt(order.address_id) : null;
        
        // 🌟 [핵심 추가] 프론트엔드에서 보낸 bidStatus 값이 있다면 업데이트 데이터에 포함!
        if (order.bidStatus !== undefined) updateData.bidStatus = order.bidStatus;

        await tx.order.update({
          where: { orderId: order.id },
          data: updateData
        });
      }
    });

    // 🔔 관리자 처리 필요 알림을 바로 보냅니다 (응답 뒤에 실행 — 기다리지 않음)
    triggerAdminOrderAlert();
    return NextResponse.json({ success: true, message: '성공적으로 처리되었습니다.' });
  } catch (error: any) {
    console.error("주문 저장 에러:", error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}

// 🔴 [DELETE] 4. 주문 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id'); 

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID(id)가 필요합니다.' }, { status: 400 });
    }

    // 🔒 본인 주문만 삭제 가능
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const target = await prisma.order.findUnique({ where: { orderId: orderId } });
    if (!target || target.userId !== auth.userId) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }
    // 🔒 결제 전(장바구니 · 경매 요청)만 지울 수 있습니다.
    //    결제한 주문을 지우면 카드 결제 기록이 주문을 잃어, 환불(결제 취소)할 근거가 사라집니다.
    if (target.status !== ORDER_STATUS.CART && target.status !== ORDER_STATUS.BID_PENDING) {
      return NextResponse.json({ error: '결제가 진행된 주문은 삭제할 수 없습니다. 고객센터로 문의해 주세요.' }, { status: 400 });
    }
    const paidItems = await prisma.paymentItem.count({ where: { orderId, payment: { status: { not: 'READY' } } } });
    if (paidItems > 0) {
      return NextResponse.json({ error: '결제 기록이 있는 주문은 삭제할 수 없습니다. 고객센터로 문의해 주세요.' }, { status: 400 });
    }

    await prisma.$transaction([
      // 결제창만 열고 끝내지 않은 결제 건(READY)에서 이 주문을 뺍니다.
      // (그 결제 건은 금액이 맞지 않게 되어 승인 단계에서 거절됩니다)
      prisma.paymentItem.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { orderId: orderId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Delete Order Error:", error);
    return NextResponse.json({ error: '주문 삭제에 실패했습니다.' }, { status: 500 });
  }
}