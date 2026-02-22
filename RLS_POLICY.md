# RLS_POLICY.md

## 1. 권한 원칙

- 모든 사용자 데이터 접근은 기본적으로 `auth.uid()` 기반 소유권 검사를 따른다.
- 최소 권한 원칙 적용: 필요한 테이블/행/컬럼만 노출한다.
- `ADMIN`은 운영 목적의 전체 접근이 가능하다.
- Maker에게는 `open` 요청에 한해 제한 필드만 노출한다.

## 2. 공통 보조 함수

### 2.1 `is_admin()`

- 정의: `profiles.role = 'ADMIN'` 여부 반환
- 용도: 정책에서 관리자 예외 처리

### 2.2 `is_verified_maker()`

- 정의: `profiles.role='MAKER'` and `maker_profiles.is_verified=true`
- 용도: 입찰 및 공개 요청 조회 권한 검증

## 3. 테이블별 정책

## 3.1 `profiles`

- `SELECT`: 본인 또는 관리자
- `INSERT`: 본인 또는 관리자
- `UPDATE`: 본인 또는 관리자
- `DELETE`: 관리자만

## 3.2 `maker_profiles`

- `SELECT`: 인증 사용자 전체 가능(민감정보 미저장 전제)
- `INSERT`: 본인 또는 관리자
- `UPDATE`: 본인 또는 관리자
- `DELETE`: 관리자만

## 3.3 `software_catalog`

- `SELECT`: 인증 사용자
- `INSERT/UPDATE/DELETE`: 관리자만

## 3.4 `recommendations`

- `SELECT`: 본인 또는 관리자
- `INSERT`: 본인 또는 관리자
- `UPDATE`: 본인 또는 관리자
- `DELETE`: 관리자만

## 3.5 `requests`

- `SELECT`: 소유자 또는 관리자
- `INSERT`: 소유자 또는 관리자
- `UPDATE`: 소유자 또는 관리자
- `DELETE`: 소유자 또는 관리자
- Maker는 base table 직접 조회 금지

## 3.6 `bids`

- `SELECT`
  - Maker 본인 입찰 조회 가능
  - User는 자신의 요청에 연결된 입찰만 조회 가능
  - 관리자 전체 조회 가능
- `INSERT`
  - Verified Maker만 가능
  - 대상 요청 상태가 `open`이고 중복 입찰이 없어야 함
- `UPDATE`
  - Maker 본인은 `submitted -> withdrawn` 전환만 가능
  - `accepted/rejected` 변경은 함수(`accept_bid_and_create_project`)에서만 수행
- `DELETE`: 관리자만

## 3.7 `projects`

- `SELECT`: 프로젝트 참여자(user_id 또는 maker_id) 또는 관리자
- `INSERT`: `accept_bid_and_create_project` 함수 경유(직접 insert 제한)
- `UPDATE`: 참여자 또는 관리자(허용 컬럼 제한)
- `DELETE`: 관리자만

## 3.8 `project_events`

- `SELECT`: 프로젝트 참여자 또는 관리자
- `INSERT`: 참여자 또는 관리자
- `UPDATE`: 관리자만
- `DELETE`: 관리자만

## 4. Maker 공개 요청 조회 정책

- Maker는 `requests` 테이블 직접 조회하지 않는다.
- `rpc_list_open_requests(limit_count int default 10, offset_count int default 0)` RPC를 통해서만 조회한다.
- 반환 필드 제한
  - `request_id`
  - `title`
  - `summary`
  - `budget_min`
  - `budget_max`
  - `deadline_date`
  - `priority`
  - `created_at`

## 5. 민감정보 비노출 전략

- maker 개인정보(이메일, 연락처 등)는 `maker_profiles`에 저장하지 않는다.
- 공개 프로필은 `display_name`, `headline`, `bio`, `skills`, `portfolio_links`, `is_verified`, `verification_badge`, `rating`, `completed_projects_count`만 노출한다.
- 사용자 요청 상세(`requirements`)는 소유자와 관리자, 그리고 입찰 가능한 최소 범위에서만 접근한다.

## 6. 정책 검증 체크리스트

1. User A가 User B의 profile/request/recommendation/project를 조회할 수 없어야 한다.
2. 미검증 Maker는 open request RPC/입찰 제출이 거부되어야 한다.
3. Maker는 자신이 작성한 bid만 수정(철회) 가능해야 한다.
4. User는 자신의 request에 달린 bid만 조회 가능해야 한다.
5. Bid 선택 후 추가 입찰 제출이 차단되어야 한다.
