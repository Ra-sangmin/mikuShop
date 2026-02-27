// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    // 🌟 중요: 클라이언트에서 FormData로 보냈으므로 formData()로 받아야 합니다.
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "파일이 없습니다." });
    }

    // 파일을 버퍼로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 저장 경로 설정: 프로젝트 루트/public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // 폴더 생성 (이미 있으면 무시)
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // 폴더 생성 에러 무시
    }

    // 파일명 중복 방지 (타임스탬프 + 파일명)
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
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