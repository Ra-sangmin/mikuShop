import GlobalLayout from "@/app/main_shop/components/GlobalLayout"; // 경로 주의

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLayout 
      platformName="야후 옥션" 
      platformDesc="실시간 일본 옥션 입찰" // 라쿠텐 카드에 있는 설명을 전달
      brandColor="#ffa600"
    >
      {children}
    </GlobalLayout>
  );
}