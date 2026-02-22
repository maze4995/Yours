# API_SPEC.md

## 1. 서버 액션 명세

## 1.1 인증

### `signUpAction(email, password)`

- 권한: 비로그인
- 입력: `{ email: string, password: string }`
- 출력: `{ ok: boolean, message?: string }`
- 실패: `AUTH_SIGNUP_FAILED`, `VALIDATION_ERROR`

### `signInAction(email, password)`

- 권한: 비로그인
- 입력: `{ email: string, password: string }`
- 출력: `{ ok: boolean, message?: string }`
- 실패: `AUTH_SIGNIN_FAILED`, `VALIDATION_ERROR`

### `signOutAction()`

- 권한: 로그인
- 출력: `{ ok: boolean }`

## 1.2 온보딩/추천

### `saveOnboardingAction(payload)`

- 권한: 로그인 사용자 본인
- 입력: `ProfileInput`
- 출력: `{ ok: boolean }`
- 실패: `VALIDATION_ERROR`, `FORBIDDEN`

### `completeOnboardingAndRecommendAction(payload)`

- 권한: 로그인 사용자 본인
- 입력: `ProfileInput`
- 처리:

1. 프로필 업서트 + `onboarding_completed=true`
2. profile fingerprint 생성
3. 기존 recommendation 캐시 조회
4. 없으면 규칙 기반 후보 + OpenAI 생성
5. `recommendations` upsert 후 반환

- 출력: `RecommendationResult`
- 실패: `OPENAI_ERROR`, `CATALOG_EMPTY`, `VALIDATION_ERROR`, `FORBIDDEN`

## 1.3 요청/입찰/프로젝트

### `createRequestAction(payload)`

- 권한: USER
- 입력: `CreateRequestInput`
- 출력: `{ ok: true, requestId: string }`
- 실패: `VALIDATION_ERROR`, `FORBIDDEN`

### `getRequestDetailAction(requestId)`

- 권한: 요청 소유자 또는 관리자
- 입력: `{ requestId: string }`
- 출력: `RequestDetail`
- 실패: `NOT_FOUND`, `FORBIDDEN`

### `submitBidAction(requestId, payload)`

- 권한: Verified MAKER
- 입력: `SubmitBidInput`
- 제약:
  - 요청 상태 `open`
  - 이미 선택 완료 상태가 아님
  - 요청당 Maker 중복 입찰 금지
- 출력: `{ ok: true, bidId: string }`
- 실패: `FORBIDDEN`, `REQUEST_CLOSED`, `DUPLICATE_BID`, `VALIDATION_ERROR`

### `withdrawBidAction(bidId)`

- 권한: bid 작성 Maker
- 출력: `{ ok: true }`
- 실패: `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`

### `selectBidAction(requestId, bidId)`

- 권한: 요청 소유 USER
- 처리: `accept_bid_and_create_project` RPC 호출
- 출력: `{ ok: true, projectId: string }`
- 실패: `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`, `RPC_FAILED`

### `getProjectDetailAction(projectId)`

- 권한: 프로젝트 참여자 또는 관리자
- 출력: `ProjectDetail`
- 실패: `FORBIDDEN`, `NOT_FOUND`

### `updateProjectStatusAction(projectId, status, note?)`

- 권한: 프로젝트 참여자 또는 관리자
- 입력: `{ status: ProjectStatus, note?: string }`
- 출력: `{ ok: true }`
- 실패: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`

### `getSettingsSummaryAction()`

- 권한: 로그인 사용자
- 출력:
  - `account`
  - `myRequests[]`
  - `myProjects[]`

## 2. Route Handler 명세

### `GET /api/requests/open`

- 권한: Verified MAKER
- 쿼리: `?page=1&pageSize=10`
- 반환 필드:
  - `request_id`, `title`, `summary`, `budget_min`, `budget_max`, `deadline_date`, `priority`, `created_at`
- 실패: `FORBIDDEN`, `UNAUTHORIZED`

### `GET /api/makers/[id]`

- 권한: 인증 사용자
- 반환: 공개 maker 프로필
- 실패: `NOT_FOUND`

### `POST /api/recommendations/regenerate`

- 권한: USER 본인(프로토타입)
- 입력: 선택적 `force: boolean`
- 처리: 현재 프로필로 추천 재계산 후 캐시 갱신
- 실패: `FORBIDDEN`, `VALIDATION_ERROR`, `OPENAI_ERROR`

## 3. 도메인 타입(JSON Shape)

```ts
type RecommendationItem = {
  softwareId: string;
  name: string;
  whyRecommended: string;
  keyFeatures: string[]; // 3~5
  pros: string[];
  cautions: string[];
  solvable: boolean;
  score: number;
};

type RecommendationResult = {
  recommendationId: string;
  items: RecommendationItem[]; // 최대 3
  fitDecision: "software_fit" | "custom_build";
  fitReason: string;
};
```

## 4. 실패 코드 표준

- `UNAUTHORIZED`: 로그인 세션 없음
- `FORBIDDEN`: 권한 부족(역할/소유권/검증 실패)
- `NOT_FOUND`: 데이터 없음 또는 접근 불가
- `VALIDATION_ERROR`: 입력 스키마 검증 실패
- `REQUEST_CLOSED`: 입찰 가능한 상태 아님
- `DUPLICATE_BID`: 동일 Maker 중복 입찰
- `INVALID_STATE`: 상태 전환 불가
- `OPENAI_ERROR`: 모델 응답 실패 또는 파싱 실패
- `RPC_FAILED`: DB 함수 실행 실패
