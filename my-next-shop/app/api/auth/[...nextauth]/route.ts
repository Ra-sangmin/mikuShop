// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";
import prisma from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID as string,
      clientSecret: process.env.NAVER_CLIENT_SECRET as string,
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID as string,
      clientSecret: process.env.KAKAO_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const provider = account?.provider || 'social';

      // 🌟 핵심 수정: 이메일이 없을 경우 고유 ID를 이용해 임시 이메일 생성
      // 이렇게 하면 카카오에서 이메일을 안 주더라도 DB 에러 없이 가입됩니다.
      const userEmail = user.email || `${provider}_${user.id}@mikuchan.local`;

      try {
        // DB에서 해당 이메일로 가입된 유저가 있는지 확인
        const existingUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        // 유저가 없으면 새로 생성 (소셜 회원가입)
        if (!existingUser) {
          await prisma.user.create({
            data: {
              loginId: `${provider}_${user.id}`, 
              email: userEmail,
              name: user.name || `${provider} 사용자`,
              password: "", 
              level: "일반회원",
              cyberMoney: 0,
            },
          });
          console.log(`새로운 ${provider} 유저 생성 완료:`, userEmail);
        } else {
          console.log(`기존 유저 로그인 (${provider}):`, userEmail);
        }

        return true; // 정상적으로 로그인 허용!
      } catch (error) {
        // 💡 만약 DB 스키마 문제 등으로 에러가 나면 여기서 잡힙니다.
        console.error("소셜 로그인 DB 체크 오류:", error);
        return false; 
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        const provider = account?.provider || 'social';
        const userEmail = user.email || `${provider}_${user.id}@mikuchan.local`;
        
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });
        if (dbUser) {
          token.id = dbUser.id;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };