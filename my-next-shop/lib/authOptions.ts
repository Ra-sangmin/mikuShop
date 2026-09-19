// 🌟 NextAuth 설정 (app/api/auth/[...nextauth]/route.ts에서 옮겨왔습니다)
// API 라우트에서 getServerSession(authOptions)로 로그인 회원을 확인할 때 같은 설정을 써야 하므로
// 별도 파일로 분리했습니다. (App Router의 route.ts는 HTTP 메서드 외의 export를 허용하지 않습니다.)
import type { NextAuthOptions } from "next-auth";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { formatKoreanMobile } from "@/lib/phone";

// 🌟 SNS 로그인 회원 찾기 (signIn·jwt 콜백이 반드시 이 함수를 함께 써야 합니다)
//
// 🐛 예전엔 이메일만으로 찾았습니다. 그런데 카카오에서 "카카오계정(이메일)" 동의를 켜는 순간
//    내려오는 이메일이 `kakao_<회원번호>@mikuchan.local`(임시값) → 실제 이메일로 바뀝니다.
//    그러면 그 이메일을 쓰는 "전혀 다른 기존 회원"이 검색돼 그 계정으로 로그인돼 버렸습니다.
//    (실제로 카카오 로그인이 테스트 계정에 붙어 미쿠짱머니가 0원으로 보이는 문제가 있었습니다)
//
//    → SNS 회원번호(loginId = `kakao_12345`)를 1순위로 봅니다. 이 값은 이메일 동의 여부나
//      동의항목 변경과 무관하게 항상 같은 사람을 가리킵니다.
//      이메일은 "SNS로는 처음이지만 같은 이메일로 이미 가입한 회원"을 이어주기 위한 2순위입니다.
async function findSocialUser(provider: string, providerUserId: string, email?: string | null) {
  const byLoginId = await prisma.user.findUnique({
    where: { loginId: `${provider}_${providerUserId}` },
  });

  if (byLoginId) return byLoginId;

  if (email) {
    return prisma.user.findUnique({ where: { email } });
  }
  return null;
}

// 📱 SNS가 내려준 휴대폰 번호를 꺼냅니다. (동의하지 않았으면 값 자체가 없습니다)
//    signIn 콜백의 profile은 프로바이더가 가공하기 전의 원본 응답이라 제공사마다 위치가 다릅니다.
//      - 네이버: response.mobile("010-1234-5678") 또는 response.mobile_e164("+821012345678")
//      - 카카오: kakao_account.phone_number("+82 10-1234-5678")
//    저장 형태(010-1234-5678)로 맞추는 일은 lib/phone.ts가 합니다. 해외 번호 등은 null이 됩니다.
type SocialPhoneProfile = {
  response?: { mobile?: string; mobile_e164?: string }; // 네이버
  kakao_account?: { phone_number?: string };            // 카카오
};

function extractSocialPhone(provider: string, profile: unknown): string | null {
  const raw = (profile ?? {}) as SocialPhoneProfile;

  // 제공사가 실제로 번호를 내려줬는지 먼저 봅니다.
  const rawPhone =
    provider === "naver" ? (raw.response?.mobile || raw.response?.mobile_e164)
    : provider === "kakao" ? raw.kakao_account?.phone_number
    : undefined;

  const formatted = formatKoreanMobile(rawPhone);

  // 📋 번호가 저장되지 않을 때 원인을 세 가지로 갈라 보기 위한 로그입니다.
  //    ① 동의항목 미설정 → 값 자체가 안 옴 (가장 흔합니다)
  //    ② 해외 번호 등    → 값은 왔지만 국내 휴대폰이 아니라 걸러짐
  //    ③ 정상
  //    ⚠️ 번호 원문은 찍지 않습니다. 받았는지 여부와 자릿수만 남깁니다.
  if (provider === "naver" || provider === "kakao") {
    if (!rawPhone) {
      console.warn(`[SNS로그인] ${provider}: 휴대폰 번호를 내려주지 않았습니다. 개발자센터의 동의항목 설정을 확인하세요.`,
        { 받은필드: Object.keys((raw.response ?? raw.kakao_account ?? {}) as object) });
    } else if (!formatted) {
      console.warn(`[SNS로그인] ${provider}: 번호를 받았지만 국내 휴대폰 형식이 아니라 저장하지 않습니다. (자릿수 ${String(rawPhone).replace(/[^0-9]/g, '').length})`);
    } else {
      console.log(`[SNS로그인] ${provider}: 휴대폰 번호를 받았습니다.`);
    }
  }

  return formatted;
}

export const authOptions: NextAuthOptions = {
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
        const existingUser = await findSocialUser(safeProvider, user.id, user.email);

        // 🌟 SNS가 내려준 프로필 이미지(카카오 프로필 사진 등). 동의하지 않았으면 비어 있습니다.
        const snsProfileImage = (user.image || '').trim() || null;

        // 📱 SNS가 내려준 휴대폰 번호. 주문 상태 알림톡 발송에 쓰므로 회원 정보에 함께 저장합니다.
        const snsPhone = extractSocialPhone(safeProvider, profile);

        // 유저가 없으면 새로 생성 (소셜 회원가입)
        if (!existingUser) {
          await prisma.user.create({
            data: {
              loginId: `${safeProvider}_${user.id}`, // SNS 유저 전용 식별 아이디
              email: userEmail,
              name: user.name || `${safeProvider} 사용자`,
              profileImage: snsProfileImage,
              phone: snsPhone,
              password: "", // SNS 로그인이므로 비밀번호는 비워둠
              membershipGrade: 0,
              cyberMoney: 0,
            },
          });
          console.log(`새로운 ${safeProvider} 유저 생성 완료:`, userEmail);
        } else {
          // 🐛 예전엔 기존 회원이 다시 로그인해도 아무것도 갱신하지 않아서, 닉네임 동의를 나중에
          //    켜도 이름이 "kakao 사용자" 같은 임시값에 머물러 있었습니다. 프로필 사진도 마찬가지입니다.
          const updates: { name?: string; profileImage?: string | null; phone?: string } = {};

          // 이름은 "아직 임시값인 경우"에만 SNS 닉네임으로 채웁니다.
          // (나중에 회원이 직접 이름을 바꾸는 기능이 생겨도 로그인할 때마다 덮어쓰지 않도록)
          const isPlaceholderName = !existingUser.name?.trim() || /^(kakao|naver|social)\s*사용자$/.test(existingUser.name.trim());
          if (user.name && isPlaceholderName && user.name !== existingUser.name) {
            updates.name = user.name;
          }

          // 프로필 사진은 직접 올리는 기능이 없어 SNS 값이 유일한 출처이므로 항상 최신으로 맞춥니다.
          if (snsProfileImage && snsProfileImage !== existingUser.profileImage) {
            updates.profileImage = snsProfileImage;
          }

          // 📱 휴대폰 번호는 "아직 비어 있는 경우"에만 채웁니다.
          //    (마이페이지에서 직접 고친 번호를 로그인할 때마다 SNS 값으로 되돌리면 안 됩니다)
          if (snsPhone && !existingUser.phone?.trim()) {
            updates.phone = snsPhone;
          }

          if (Object.keys(updates).length > 0) {
            await prisma.user.update({ where: { id: existingUser.id }, data: updates });
            console.log(`기존 유저 프로필 갱신 (${safeProvider}):`, Object.keys(updates).join(', '));
          }
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
        // ⚠️ signIn 콜백과 반드시 같은 기준으로 찾아야 합니다. (다르면 A 계정에 저장하고 B 계정으로 로그인됨)
        else {
          const dbUser = await findSocialUser(provider || 'social', user.id, user.email);
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
};
