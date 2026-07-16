// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    // 🌟 1. 일반 로그인: 이메일 대신 '아이디(loginId)'로 검증하도록 수정
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        userId: { label: "아이디", type: "text" }, // 프론트엔드에서 보낸 userId 매핑
        password: { label: "비밀번호", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.password) return null;

        // DB에서 유저 조회 (email 대신 loginId로 조회)
        // 주의: prisma.user 모델에서 loginId가 @unique로 설정되어 있어야 합니다.
        const user = await prisma.user.findUnique({
          where: { loginId: credentials.userId } 
        });

        console.log("일반 로그인 시도:", credentials.userId, user ? "유저 존재" : "유저 없음");

        // 1. 아이디 자체가 존재하지 않음
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        
        // 2. 소셜 가입자(비밀번호가 없는 유저)가 일반 로그인을 시도할 때 방어
        if (!user.password) {
          throw new Error("PASSWORD_INCORRECT"); // 또는 "SOCIAL_LOGIN_ONLY" 등 커스텀 에러
        }

        // 3. 비밀번호 불일치
        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) {
          throw new Error("PASSWORD_INCORRECT");
        }
        
        return { id: user.id.toString(), email: user.email, name: user.name, loginId: user.loginId };
      }
    }),

    // 🌟 2. SNS 로그인 프로바이더
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
      const provider = account?.provider;

      // 일반 로그인(credentials)일 경우, authorize에서 이미 검증이 끝났으므로 바로 통과
      if (provider === "credentials") {
        return true; 
      }

      // SNS 로그인일 경우 아래 로직 실행
      const safeProvider = provider || 'social';
      const userEmail = user.email || `${safeProvider}_${user.id}@mikuchan.local`;

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        // 유저가 없으면 새로 생성 (소셜 회원가입)
        if (!existingUser) {
          await prisma.user.create({
            data: {
              loginId: `${safeProvider}_${user.id}`, // SNS 유저 전용 식별 아이디
              email: userEmail,
              name: user.name || `${safeProvider} 사용자`,
              password: "", // SNS 로그인이므로 비밀번호는 비워둠
              level: "일반회원",
              cyberMoney: 0,
            },
          });
          console.log(`새로운 ${safeProvider} 유저 생성 완료:`, userEmail);
        } else {
          console.log(`기존 유저 로그인 (${safeProvider}):`, userEmail);
        }

        return true; 
      } catch (error) {
        console.error("소셜 로그인 DB 체크 오류:", error);
        return false; 
      }
    },

    async jwt({ token, user, account }) {
      // 최초 로그인 성공 시 user 객체가 들어옴
      if (user) {
        const provider = account?.provider;
        token.provider = provider; // 프론트에서 SNS 구분을 위해 세션에 담을 provider 저장

        // 일반 로그인이면 이미 DB 검증된 user.id를 그대로 사용
        if (provider === "credentials") {
          token.id = user.id;
        } 
        // SNS 로그인이면 DB에서 다시 조회해서 고유 ID를 가져옴
        else {
          const safeProvider = provider || 'social';
          const userEmail = user.email || `${safeProvider}_${user.id}@mikuchan.local`;
          
          const dbUser = await prisma.user.findUnique({
            where: { email: userEmail },
          });
          if (dbUser) {
            token.id = dbUser.id;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).provider = token.provider; // 프론트엔드에서 로그인 방식 판별 가능
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };