# Yours Prototype

퍼스널 소프트웨어 추천 + 개발자 역경매 매칭 웹 프로토타입입니다.

## 기술 스택

- Next.js 15+ (App Router, TypeScript strict)
- TailwindCSS + shadcn/ui 패턴 컴포넌트
- Supabase (Postgres, Auth, RLS)
- OpenAI API (서버 호출)
- Vercel 배포 대상

## 핵심 플로우

1. `/` 랜딩
2. `/auth` 로그인/가입
3. `/onboarding` 멀티스텝 프로파일링
4. `/results` 소프트웨어 추천(최대 3개)
5. `/request/new` 맞춤 개발 요청 생성
6. `/bids/[requestId]` Maker 입찰 / User 비교·선택
7. `/project/[id]` 프로젝트 상태/타임라인
8. `/settings` 내 계정/요청/프로젝트

## 1시간 내 로컬 재현 절차

## 1) 환경변수

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase/OpenAI 값을 채웁니다.

로컬 Supabase 실행 전 Docker Desktop이 설치/실행 중이어야 합니다.

## 2) 의존성 설치

```bash
npm install
```

## 3) Supabase 로컬 실행

```bash
npx supabase start
```

## 4) 마이그레이션 + 시드 반영

```bash
npx supabase db reset
```

`supabase/seed.sql`에서 `software_catalog` 30개가 입력됩니다.

## 5) 테스트 계정 생성

```bash
node scripts/create-test-users.mjs
```

기본 계정:

- USER: `user@example.com` / `UserPass123!`
- MAKER: `maker@example.com` / `MakerPass123!`

## 6) 앱 실행

```bash
npm run dev
```

브라우저: `http://localhost:3000`

## 품질 체크 명령

```bash
npm run lint
npm run typecheck
npm run test
```

## Supabase 구조

- 마이그레이션: `supabase/migrations/20260222070000_init_schema.sql`
- 시드: `supabase/seed.sql`
- 주요 RPC
  - `rpc_list_open_requests(limit_count, offset_count)`
  - `accept_bid_and_create_project(p_request_id, p_bid_id)`

## RLS 요약

- USER: 본인 profile/recommendation/request/project만 접근
- MAKER: 본인 maker_profile/bid 접근 + `open` request 제한조회(RPC)
- ADMIN: 전체 접근

## 테스트 시나리오

1. USER 로그인 → 온보딩 완료 → 추천 결과 확인
2. 맞춤 개발 요청 생성
3. MAKER 로그인 → open request 조회 → 입찰 제출
4. USER 로그인 → 입찰 선택 → 프로젝트 생성 확인

## Vercel 배포

1. Git 저장소를 Vercel에 연결
2. 환경변수 설정
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
3. `npm run build` 성공 확인 후 배포

## 참고 문서

- 구현 계획: `PLANS.md`
- DB 설계: `DB_SCHEMA.md`
- RLS 정책: `RLS_POLICY.md`
- API 명세: `API_SPEC.md`
