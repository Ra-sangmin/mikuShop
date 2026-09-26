// 🔑 웹 푸시용 VAPID 키 한 쌍을 만듭니다. (한 번만 실행해서 .env 에 넣으면 됩니다)
//
//   node scripts/generate-vapid-keys.mjs            → 화면에 출력
//   node scripts/generate-vapid-keys.mjs >> .env    → .env 끝에 바로 추가 (화면에 비밀키가 안 남음)
//
// ⚠️ 이미 키가 있으면 다시 만들지 마세요. 바꾸면 등록된 기기가 모두 다시 "알림 받기"를 해야 합니다.
import crypto from 'node:crypto';

const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);

console.log('');
console.log('# 🔔 관리자 웹 푸시 (scripts/generate-vapid-keys.mjs)');
console.log(`VAPID_PUBLIC_KEY=${pub.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
console.log('VAPID_SUBJECT=mailto:admin@mikushop.co.kr');
