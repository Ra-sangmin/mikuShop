import GlobalLayout from "@/app/main_shop/components/GlobalLayout"; // 경로 주의

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLayout 
      platformName="라쿠텐" 
      platformDesc="일본 대표 종합 쇼핑몰" // 라쿠텐 카드에 있는 설명을 전달
      brandColor="#bf0000"
    >
      {children}
    </GlobalLayout>
  );
}