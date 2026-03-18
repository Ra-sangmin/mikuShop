import GlobalLayout from "@/app/main_shop/components/GlobalLayout"; // 경로 주의

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLayout 
      platformName="메루카리" 
      platformDesc="일본 최대 중고거래 사이트" 
      brandColor="#ff0021"
    >
      {children}
    </GlobalLayout>
  );
}