// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireUser } from '@/lib/apiAuth';

// 🔒 허용하는 이미지 형식(확장자는 서버가 정함)과 최대 크기
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 🔒 파일 내용(매직 바이트)으로 실제 형식을 판정합니다.
// 클라이언트가 보내는 file.type은 위조할 수 있어 신뢰하지 않습니다.
// (예: HTML/스크립트 파일을 Content-Type: image/png 로 올리는 경우)
function sniffImageExtension(buffer: Buffer): string | null {
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'png';
  }
  // GIF: "GIF87a" 또는 "GIF89a"
  if (buffer.length >= 6) {
    const head = buffer.subarray(0, 6).toString('latin1');
    if (head === 'GIF87a' || head === 'GIF89a') return 'gif';
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export async function POST(req: Request) {
  // 🔒 로그인 회원만 업로드 가능
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    // 🌟 중요: 클라이언트에서 FormData로 보냈으므로 formData()로 받아야 합니다.
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "파일이 없습니다." });
    }

    // 🔒 크기 검사 (내용을 읽기 전에 먼저 걸러 메모리 낭비를 막습니다)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "10MB 이하 이미지만 업로드할 수 있습니다." }, { status: 400 });
    }

    // 파일을 버퍼로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 🔒 형식 검사: 실제 파일 내용으로 판정합니다.
    // (SVG·HTML 등 스크립트가 들어갈 수 있는 파일은 여기서 걸러집니다)
    const ext = sniffImageExtension(buffer);
    if (!ext) {
      return NextResponse.json({ success: false, error: "JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다." }, { status: 400 });
    }

    // 저장 경로 설정: 프로젝트 루트/public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // 폴더 생성 (이미 있으면 무시)
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // 폴더 생성 에러 무시
    }

    // 🔒 파일명은 서버에서 생성합니다. (사용자 파일명의 경로 조작 문자 차단 + 중복 방지)
    const fileName = `${Date.now()}_${randomUUID()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // 파일 물리적 저장
    await writeFile(filePath, buffer);

    // 웹에서 접근 가능한 상대 경로 URL 반환
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ success: false, error: "서버 업로드 중 오류가 발생했습니다." }, { status: 500 });
  }
}