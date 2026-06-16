import GlobalLayout from "@/app/main_shop/components/GlobalLayout"; // 경로 주의

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLayout 
      platformName="야후 쇼핑" 
      platformDesc="다양한 혜택의 야후 쇼핑" 
      brandColor="#bf0000"
    >
      {children}
    </GlobalLayout>
  );
}
