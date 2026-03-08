import { NextResponse, NextRequest } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';

let sharedBrowser: Browser | null = null;

// 🚀 [추가] 한국어 필터 값을 메루카리 전용 ID/파라미터로 변환하는 매퍼
const MAPPERS = {
  sort: (val: string) => {
    switch (val) {
      case '가격 낮은 순': return { sort: 'price', order: 'asc' };
      case '가격 높은 순': return { sort: 'price', order: 'desc' };
      case '최신순': return { sort: 'created_at', order: 'desc' };
      default: return { sort: 'score', order: 'desc' }; // 기본순
    }
  },
  condition: (val: string) => {
    const map: { [key: string]: string } = {
      '신품, 미사용': '1',
      '미사용에 가까움': '2',
      '눈에 띄는 흠집 없음': '3',
      '다소 흠집 있음': '4',
      '전반적으로 나쁨': '6'
    };
    return map[val] || '';
  },
  shippingPayer: (val: string) => (val === '배송비 포함' ? '2' : val === '배송비 제외' ? '1' : ''),
  status: (val: string) => (val === '판매중' ? 'on_sale' : val === '품절' ? 'sold_out' : ''),
  item_types: (val: string) => (val === '개인' ? 'mercari' : val === '메루카리샾' ? 'beyond' : '')
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category_id') ?? ''

  //try {

    // 1. 🚀 메루카리 타겟 URL 동적 생성
    const targetUrl = new URL('https://jp.mercari.com/search');

    // 필터 데이터 추출 및 매핑
    const keyword = searchParams.get('keyword');
    const exclude = searchParams.get('exclude_keyword');
    const minPrice = searchParams.get('price_min');
    const maxPrice = searchParams.get('price_max');
    const sortVal = searchParams.get('sort');
    const conditionVal = searchParams.get('item_condition_id');
    const shippingVal = searchParams.get('shipping_payer_id');
    const statusVal = searchParams.get('status');
    const item_types = searchParams.get('item_types');
    const listingType = searchParams.get('listingType');
    const hasDiscount = searchParams.get('hasDiscount');
    const shipping_method = searchParams.get('shipping_method');
    const color_id = searchParams.get('color_id');


    // 파라미터 조립
    //if (keyword) targetUrl.searchParams.append('keyword', keyword);
    //if (exclude) targetUrl.searchParams.append('exclude_keyword', exclude);
    //if (minPrice) targetUrl.searchParams.append('price_min', minPrice);
    //if (maxPrice) targetUrl.searchParams.append('price_max', maxPrice);
    
    // 정렬 매핑 적용
    if (sortVal) {
      const { sort, order } = MAPPERS.sort(sortVal);
      targetUrl.searchParams.append('sort', sort);
      targetUrl.searchParams.append('order', order);
    }

    // 상태 및 배송료 매핑 적용
    // if (conditionVal && conditionVal !== '모두') {
    //   targetUrl.searchParams.append('item_condition_id', MAPPERS.condition(conditionVal));
    // }
    // if (shippingVal && shippingVal !== '모두') {
    //   targetUrl.searchParams.append('shipping_payer_id', MAPPERS.shippingPayer(shippingVal));
    // }
    if (statusVal && statusVal !== '모두') {
      targetUrl.searchParams.append('status', MAPPERS.status(statusVal));
    }

    let targetUrl2 = `https://jp.mercari.com/search?`;

    //카테고리ID
    if (categoryId) {
      targetUrl2 += `category_id=${categoryId}`;
      //targetUrl.searchParams.append('category_id', categoryId);
    }

    //정렬
    if (sortVal) {
      targetUrl2 += `&sort=${sortVal}`;
      //targetUrl.searchParams.append('sort', sortVal);
    }

    //검색어
    if (keyword) {
      targetUrl2 += `&keyword=${keyword}`;
      //targetUrl.searchParams.append('keyword', keyword);
    }

    //제외할 단어
    if (exclude) {
      targetUrl2 += `&exclude_keyword=${exclude}`;
      //targetUrl.searchParams.append('keyword', keyword);
    }

    //출품자
    if (item_types) {
      targetUrl2 += `&item_types=${item_types}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //최소 가격
    if (minPrice) {
      targetUrl2 += `&price_min=${minPrice}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //최대 가격
    if (maxPrice) {
      targetUrl2 += `&price_max=${maxPrice}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //물품의 상태
    if (conditionVal) {
      targetUrl2 += `&item_condition_id=${conditionVal}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //배송료 부담
    if (shippingVal) {
      targetUrl2 += `&shipping_payer_id=${shippingVal}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //할인 옵션
    if (hasDiscount) {
      targetUrl2 += `&47295d80-5839-4237-bbfc-deb44b4e7999=${hasDiscount}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //출품 형태
    if (listingType) {
      targetUrl2 += `&d664efe3-ae5a-4824-b729-e789bf93aba9=${listingType}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //색상
    if (color_id) {
      targetUrl2 += `&color_id=${color_id}`;
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //배송 옵션
    if (shipping_method) {
      targetUrl2 += `&shipping_method=${shipping_method}`;
      //targetUrl.searchParams.append('status', statusVal);
      //targetUrl.searchParams.append('item_types', item_types);
    }

    //판매상황
    if (statusVal) {
      targetUrl2 += `&status=${statusVal}`;
      //targetUrl.searchParams.append('status', statusVal);
      //targetUrl.searchParams.append('item_types', item_types);
    }



















    const stream = new ReadableStream<Uint8Array>({
      // 💡 controller 타입을 any로 두어 Node/Web 타입 충돌을 완벽히 우회합니다.
      async start(controller: any) {
        try {
          if (!sharedBrowser || !sharedBrowser.connected) {
            sharedBrowser = await puppeteer.launch({ 
              headless: true, 
              args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
          }
          const page = await sharedBrowser.newPage();
          
          await page.setRequestInterception(true);
          page.on('request', (r) => r.resourceType() === 'image' ? r.abort() : r.continue());

          await page.goto(targetUrl2, { waitUntil: 'domcontentloaded', timeout: 30000 });

          let sentItems = new Set<string>(); // 💡 제네릭 명시
          let attempt = 0;
          let emptyAttempts = 0;

          // 스크롤을 내리며 최대 5번 조각 데이터를 쏴줍니다.
          while (attempt < 20) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 1200));

            const currentItems = await page.evaluate(() => {
              const cells = document.querySelectorAll('li[data-testid="item-cell"], div[data-testid="item-cell"]');
              return Array.from(cells).map(el => {

                const link = el.querySelector('a')?.getAttribute('href') || '';
                const id = link.split('/').pop() || '';
                const name = 
                    el.querySelector('img')?.getAttribute('alt') || // 1. 이미지의 alt 태그 (가장 확실함)
                    el.querySelector('a')?.getAttribute('aria-label') || // 2. 링크의 접근성 라벨
                    el.querySelector('[data-testid="thumbnail-item-name"]')?.textContent?.trim() || // 3. 기존 이름 태그
                    el.querySelector('[class*="itemName"]')?.textContent?.trim() || // 4. 클래스명에 itemName이 들어간 곳
                    '상품명 없음'; // 정 못 찾으면 기본값
                const priceEl = el.querySelector('[class*="number"]') || el.querySelector('span[class*="price"]');
                const priceText = priceEl?.textContent?.trim() || '0';
                const thumbnail = el.querySelector('img')?.src || '';
                
                const isSoldOut = 
                  el.querySelector('[data-testid="thumbnail-sticker-sold"]') !== null || // 1. 전용 품절 스티커 태그 존재 여부
                  el.innerHTML.includes('売り切れ') ||                                  // 2. 일본어 품절 텍스트 포함 여부
                  el.innerHTML.includes('SOLD');                                       // 3. 영문 품절 텍스트 포함 여부

                return {
                  id, name, thumbnail,
                  price: parseInt(priceText.replace(/[^0-9]/g, ''), 10),
                  status: isSoldOut ? 'sold_out' : 'on_sale', // 💡 더 정확해진 품절 판정
                  url: `https://jp.mercari.com${link}`
                };
              });
            });

            // 새로운 상품만 필터링
            const newItems = currentItems.filter(item => 
              item.id && item.price > 0 && !sentItems.has(item.id)
            );

            if (newItems.length > 0) {
              // ✨ 새로운 상품 발견! 카운트 초기화 및 전송
              emptyAttempts = 0;

              newItems.forEach(item => sentItems.add(item.id));
              
              // 🚀 인코더를 사용해 청크 전송
              const chunk = JSON.stringify({ success: true, data: newItems }) + '\n';
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            else
            {
                // ⚠️ 새로운 상품이 없음
                emptyAttempts++;
                
                // 💡 3번 연속(약 3.6초) 새로운 상품이 발견되지 않으면 바닥이라고 판단하고 중단
                if (emptyAttempts >= 3) {
                  console.log(`🏁 [Crawling End] 더 이상 새로운 상품이 없어 수집을 중단합니다. (Total: ${sentItems.size}개)`);
                  break; 
                }
            }
            
            attempt++;
          }

          await page.close();
          controller.close(); 

        } catch (err: any) {
          const errorChunk = JSON.stringify({ success: false, error: err.message }) + '\n';
          controller.enqueue(new TextEncoder().encode(errorChunk));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
}
  



    /*
    

    //const targetUrl2 = `https://jp.mercari.com/search?category_id=3088&sort=price&order=asc`;

    console.log(`🌐 [Crawling Target] ${sortVal}  ${targetUrl2.toString()}  `);

    const readableUrl = decodeURIComponent(targetUrl.toString());
    //return NextResponse.json({ success: false, error: readableUrl.toString() }, { status: 500 });

    if (!sharedBrowser || !sharedBrowser.connected) {
      sharedBrowser = await puppeteer.launch({ 
        headless: true, 
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // 🚀 [핵심 1] 자동화 도구임을 숨깁니다.
          '--window-size=1920,1080'
        ] 
      });
    }

    const page = await sharedBrowser.newPage();
    
    // 🚀 [핵심 2] 사람이 쓰는 브라우저처럼 위장 (Stealth 설정)
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluateOnNewDocument(() => {
      // @ts-ignore
      Object.defineProperty(navigator, 'webdriver', { get: () => false }); // webdriver 신호 제거
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');


    //const categoryId = searchParams.get('category_id');
    //targetUrl.searchParams.append('category_id', categoryId);

    //const targetUrl = `https://jp.mercari.com/search?category_id=${categoryId}`;
    
    // 🚀 [핵심 3] 리소스 차단 해제 (성공할 때까지는 이미지를 포함한 모든 자원을 로드합니다.)
    // 속도 최적화는 데이터가 나온 이후에 다시 잡아도 늦지 않습니다.
    
    await page.goto(targetUrl2.toString(), { 
      waitUntil: 'networkidle2', // 🚀 모든 스크립트가 실행될 때까지 충분히 기다림
      timeout: 45000 
    });

    // 🚀 [핵심 4] 사람이 보는 것처럼 페이지 하단으로 살짝 스크롤 (Lazy Loading 깨우기)
    await page.evaluate(() => {
      window.scrollBy(0, 800);
    });
    
    // 데이터 렌더링을 위해 3초간 확실히 대기
    await new Promise(res => setTimeout(res, 2500));

    // 데이터 추출
    const items = await page.evaluate(() => {
      // 💡 여러 가지 셀렉터 패턴을 모두 시도합니다.
      const cells = document.querySelectorAll('li[data-testid="item-cell"], div[data-testid="item-cell"]');
      
      return Array.from(cells).map(el => {
        const link = el.querySelector('a')?.getAttribute('href') || '';
        const id = link.split('/').pop() || '';
        const name = el.querySelector('span[data-testid="thumbnail-item-name"]')?.textContent?.trim() || 
                     el.querySelector('img')?.getAttribute('alt') || '';
        
        const priceEl = el.querySelector('[class*="number"]') || el.querySelector('span[class*="price"]');
        const priceText = priceEl?.textContent?.trim() || '0';
        
        const imgEl = el.querySelector('img');
        const thumbnail = imgEl?.src || imgEl?.getAttribute('data-src') || '';
        
        return {
          id,
          name,
          price: parseInt(priceText.replace(/[^0-9]/g, ''), 10),
          thumbnail,
          status: el.innerHTML.includes('SOLD') ? 'sold_out' : 'on_sale',
          url: `https://jp.mercari.com${link}`
        };
      });
    });

    await page.close(); 
    
    // 유효한 데이터만 필터링
    const validItems = items.filter(item => item.id && (item.name || item.price > 0));

    // 💡 데이터가 0개라면 서버 콘솔에 원인을 출력합니다.
    if (validItems.length === 0) {
      console.error("❌ 데이터 추출 실패: 아이템 셀을 찾을 수 없습니다.");
    }
    
    return NextResponse.json({ success: true, count: validItems.length, data: validItems , targetUrl: targetUrl.toString() });

  } catch (error: any) {
    console.error("DEBUG ERROR:", error.message);
    sharedBrowser = null;
    return NextResponse.json({ success: false, error: "서버가 데이터를 차단했습니다." }, { status: 500 });
  }


    
}*/