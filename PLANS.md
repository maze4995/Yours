# 퍼스널 소프트웨어 추천 + 개발자 역경매 프로토타입 구현 계획

## 1. 제품 목표와 비목표

- 목표
  - 미니멀하지만 끝까지 완주 가능한 SaaS형 프로토타입을 구현한다.
  - 핵심 사용자 플로우(랜딩 → 인증 → 온보딩 → 추천 → 요청 → 입찰 → 선택 → 프로젝트 추적)를 단일 앱에서 제공한다.
  - Supabase RLS로 데이터 접근 경계를 명확히 보장한다.
- 비목표
  - 결제 연동, 리뷰 시스템, 채팅, 마켓 검색, 자동 고급 매칭 알고리즘은 이번 범위에서 제외한다.

## 2. 사용자 플로우

1. `/` 랜딩 페이지에서 서비스 소개 및 CTA 제공
2. `/auth`에서 이메일/비밀번호 회원가입 또는 로그인
3. 로그인 직후 `/onboarding` 멀티스텝 폼 작성
4. `/results`에서 추천 소프트웨어(최대 3개) 확인
5. 맞춤 개발 필요 시 `/request/new`에서 개발 요청 생성
6. `/request/[id]`에서 요청 상태 확인 및 입찰 목록으로 이동
7. `/bids/[requestId]`에서 검증된 Maker 입찰 비교 후 1명 선택
8. 선택 시 `/project/[id]` 생성되어 상태/히스토리 추적
9. `/settings`에서 계정/내 요청/내 프로젝트 요약 조회

## 3. 아키텍처

- Frontend/Backend: Next.js 15 App Router + Server Actions
- UI: TailwindCSS + shadcn/ui 컴포넌트 패턴
- 인증/DB/스토리지: Supabase Auth + Postgres + RLS
- AI: 서버에서 OpenAI API 호출(환경변수 키 사용)
- 추천 파이프라인
  1. `software_catalog`에서 규칙 기반 후보 Top N 추출
  2. OpenAI로 후보 설명 강화(JSON 스키마 강제)
  3. 결과를 `recommendations`에 캐시

## 4. 구현 순서

1. 문서 4종 작성 (`PLANS.md`, `DB_SCHEMA.md`, `RLS_POLICY.md`, `API_SPEC.md`)
2. Next.js 프로젝트 초기화 + lint/prettier/lint-staged/husky 구성
3. Supabase 마이그레이션(스키마/함수/RLS) 및 시드 작성
4. 공통 타입/유틸/클라이언트 구성
5. 인증/온보딩/추천 로직(Server Actions) 구현
6. 요청/입찰/선택/프로젝트 플로우 구현
7. 최소 API Route Handler 구현
8. 테스트(유닛/서버액션 통합 수준) 및 수동 시나리오 검증
9. README 작성 및 실행 절차 정리

## 5. 에러/로딩/접근성 기준

- 에러
  - 서버 액션 반환 타입을 표준화해 사용자 친화적 메시지 표시
  - UI에서 토스트 및 인라인 에러 배너 제공
- 로딩
  - 폼 제출 시 버튼 로딩 상태
  - 주요 페이지에서 skeleton 또는 spinner 제공
- 접근성
  - 라벨-입력 연결, 버튼 텍스트 명확화, aria-label 최소 적용

## 6. 배포 및 재현 절차 개요

- 로컬
  1. `npm install`
  2. `.env.local` 구성
  3. `npx supabase start`
  4. `npx supabase db reset`
  5. `node scripts/create-test-users.mjs`
  6. `npm run dev`
- 배포
  - Vercel에 환경변수 설정 후 연결
  - Supabase 프로젝트 URL/키와 OpenAI 키 주입

## 7. 완료 기준

- 필수 라우트 10개 모두 렌더링 및 핵심 액션 동작
- 추천 결과(1~3개) 또는 맞춤개발 분기 정상 동작
- 검증된 Maker만 입찰 가능
- Bid 선택 시 Request/Bid/Project 상태 전이가 원자적으로 수행
- RLS로 타 사용자 데이터 접근 차단
- README 기준 1시간 내 재현 가능
