'use client';

// 📷 사진 검색용 사진 준비 — 브라우저에서 긴 변 768px JPEG 로 줄여 보냅니다.
//  - 휴대폰 사진(3~10MB)을 그대로 보내면 업로드가 느리고 서버(Nginx) 본문 한도에 걸립니다.
//  - Gemini 는 768px 이면 상품·로고를 알아보기에 충분하고, 토큰도 적게 씁니다.
//  - 사진은 서버 어디에도 저장하지 않습니다(분석에만 쓰고 버림).

export interface PreparedImage {
  /** 미리보기·대화 말풍선용 (data:image/jpeg;base64,...) */
  dataUrl: string;
  mimeType: 'image/jpeg';
  /** 서버로 보낼 base64 (머리 없이) */
  data: string;
}

const MAX_SIDE = 768;
const QUALITY = 0.85;
/** 원본이 너무 크면 디코딩 전에 거절합니다 (메모리 보호) */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export class SearchImageError extends Error {}

/** 📱 일부 안드로이드 갤러리는 파일 형식(type)을 비워서 넘깁니다 → 확장자로 한 번 더 봅니다. */
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || (!file.type && IMAGE_EXT.test(file.name));
}
function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

type Drawable = { source: CanvasImageSource; width: number; height: number; close?: () => void };

function loadWithImg(file: File): Promise<Drawable> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/**
 * 사진 열기.
 *  1) createImageBitmap — 휴대폰의 큰 사진(1200만~4800만 화소)도 메모리를 덜 쓰고, 사진의 회전 정보(EXIF)를 반영합니다.
 *  2) 안 되면 <img> 로 (예전 사파리 등)
 *  ⚠️ 안드로이드 크롬은 HEIC(아이폰·일부 갤럭시 고효율 사진)를 열지 못합니다 → 안내 문구.
 *     (아이폰 사파리는 사진을 고를 때 JPEG 로 바꿔 넘겨 주므로 보통 문제없습니다)
 */
async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* 아래 <img> 로 다시 시도 */ }
  }
  try {
    return await loadWithImg(file);
  } catch {
    throw new SearchImageError(
      isHeic(file)
        ? '이 사진 형식(HEIC)은 열 수 없어요. 카메라 설정에서 \'높은 호환성\'(JPG)으로 찍거나, 화면을 캡처해서 올려 주세요.'
        : '이 사진은 열 수 없어요. JPG·PNG 사진으로 올려 주세요.',
    );
  }
}

export async function prepareSearchImage(file: File): Promise<PreparedImage> {
  if (!isImageFile(file)) throw new SearchImageError('사진 파일만 올릴 수 있어요.');
  if (file.size > MAX_FILE_BYTES) throw new SearchImageError('사진이 너무 커요. 20MB 이하 사진으로 올려 주세요.');

  const img = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new SearchImageError('사진을 준비하지 못했어요.');
  // 투명 PNG 는 JPEG 로 바꿀 때 검게 변하지 않도록 흰 바탕을 깝니다.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img.source, 0, 0, w, h);
  img.close?.();

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  return { dataUrl, mimeType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}

/** 붙여넣기·끌어다 놓기에서 첫 번째 사진 파일을 꺼냅니다. */
export function firstImageFile(list: FileList | DataTransferItemList | null | undefined): File | null {
  if (!list) return null;
  for (const entry of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const file = entry instanceof File ? entry : entry.kind === 'file' ? entry.getAsFile() : null;
    if (file && isImageFile(file)) return file;
  }
  return null;
}
