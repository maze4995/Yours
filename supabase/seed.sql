insert into public.software_catalog (
  name,
  category,
  target_roles,
  tags,
  description,
  pricing_model,
  website_url,
  key_features,
  pros_template,
  cons_template,
  is_active
)
values
  -- ═══════════════════════════════════════
  -- Project Management / 협업
  -- ═══════════════════════════════════════
  (
    'Notion',
    'Project Management',
    array['product manager', 'operations', 'founder'],
    array['knowledge-base', 'collaboration', 'docs', 'tasks'],
    '문서, 위키, 프로젝트 관리를 결합한 올인원 워크스페이스',
    'Free + Team',
    'https://www.notion.so',
    array['문서/위키', 'DB 기반 프로젝트 트래킹', '협업 코멘트', '템플릿'],
    array['빠른 도입', '유연한 커스터마이징', '협업 친화적'],
    array['복잡한 프로세스에는 설계 필요', '권한모델 세분화 한계'],
    true
  ),
  (
    'Flow (플로우)',
    'Project Management',
    array['operations', 'pm', 'founder', 'small team', 'marketing manager'],
    array['tasks', 'collaboration', 'workflow', 'kanban', 'automation'],
    '한국 스타트업·중소기업 친화형 태스크 관리 협업 플랫폼',
    'Freemium',
    'https://flow.team',
    array['태스크/칸반', '프로젝트 대시보드', '팀 메신저 내장', '파일 공유'],
    array['한국어 UI 완전 지원', '직관적 온보딩', '카카오 계정 연동'],
    array['외부 앱 연동 수 제한', '고급 리포팅 부족'],
    true
  ),
  (
    '카카오워크 (Kakao Work)',
    'Project Management',
    array['founder', 'operations', 'marketing manager', 'small team', 'pm'],
    array['collaboration', 'messaging', 'tasks', 'scheduling', 'workflow'],
    '카카오 기반 비즈니스 메신저 + 협업 올인원 플랫폼',
    'Freemium',
    'https://kakaowork.com',
    array['팀 채팅/영상통화', '태스크 관리', '전자결재', '캘린더'],
    array['카카오 계정 연동 간편', '무료 플랜 기능 충분', '모바일 앱 완성도 높음'],
    array['외부 서비스 연동 제한적', '대규모 조직 권한 관리 복잡'],
    true
  ),
  (
    '네이버웍스 (Naver Works)',
    'Project Management',
    array['operations', 'founder', 'small team', 'pm', 'marketing manager'],
    array['collaboration', 'email', 'calendar', 'tasks', 'scheduling'],
    '이메일·캘린더·드라이브·메신저를 통합한 클라우드 비즈니스 협업 도구',
    'Freemium',
    'https://naver.worksmobile.com',
    array['비즈니스 메일', '공유 캘린더', '드라이브', '화상회의'],
    array['네이버 계정 연동', '중소기업 무료 플랜 제공', '모바일 앱 안정적'],
    array['글로벌 서비스 연동 약함', '고급 자동화 기능 미흡'],
    true
  ),
  (
    '두레이 (Dooray!)',
    'Project Management',
    array['product manager', 'operations', 'developer', 'pm'],
    array['project-management', 'tasks', 'collaboration', 'email', 'workflow'],
    'NHN의 메일·메신저·프로젝트·캘린더 통합 업무 플랫폼',
    'Paid',
    'https://dooray.com',
    array['프로젝트/이슈 트래킹', '비즈니스 메일', '위키', '전자결재'],
    array['올인원 업무 통합', '보안 인증(ISMS) 취득', '대기업 레퍼런스 다수'],
    array['초기 학습 비용', '디자인 다소 구식'],
    true
  ),
  (
    'Jira',
    'Project Management',
    array['developer', 'engineering manager', 'scrum master'],
    array['agile', 'issue-tracking', 'sprints', 'workflow'],
    '애자일 개발팀을 위한 이슈 추적·스프린트 관리 도구',
    'Standard + Premium',
    'https://www.atlassian.com/software/jira',
    array['백로그/스프린트', '워크플로우 커스터마이징', '릴리즈 트래킹', '자동화'],
    array['개발팀 표준 도구', '확장성 높음'],
    array['비개발 직군 접근성 낮음', '운영 복잡도'],
    true
  ),
  (
    'Linear',
    'Project Management',
    array['developer', 'startup founder', 'product manager'],
    array['issue-tracking', 'fast-ui', 'engineering', 'sprints'],
    '빠른 속도와 단순한 UX의 개발 이슈 트래킹 도구',
    'Free + Team',
    'https://linear.app',
    array['이슈/로드맵', '사이클 관리', 'Git 연동'],
    array['속도와 사용성 우수', '개발 워크플로우 적합'],
    array['비개발 업무 범용성 제한'],
    true
  ),

  -- ═══════════════════════════════════════
  -- CRM
  -- ═══════════════════════════════════════
  (
    '채널톡 (Channel Talk)',
    'CRM',
    array['customer success', 'support', 'founder', 'marketer', 'sales', 'smb sales'],
    array['crm', 'live-chat', 'support', 'helpdesk', 'messaging', 'pipeline'],
    '한국 1위 고객 채팅 CRM. 라이브챗·마케팅·CRM을 하나로 통합',
    'Free + Team',
    'https://channel.io',
    array['실시간 라이브챗', '고객 CRM', '마케팅 자동화', '챗봇', '팀 인박스'],
    array['국내 스타트업 표준 툴', '설치 10분 완료', '카카오/네이버 채널 연동'],
    array['고급 CRM은 유료 플랜 필요', '대규모 세일즈 파이프라인에는 한계'],
    true
  ),
  (
    'HubSpot CRM',
    'CRM',
    array['sales', 'marketing', 'customer success'],
    array['crm', 'pipeline', 'lead-management', 'automation'],
    '리드 관리부터 세일즈 자동화까지 제공하는 글로벌 CRM',
    'Free + Starter',
    'https://www.hubspot.com',
    array['연락처/딜 파이프라인', '이메일 추적', '리포트', '자동화'],
    array['초기 도입 용이', '마케팅 연계 강점'],
    array['고급 기능 비용 상승', '복잡한 커스텀은 제한'],
    true
  ),
  (
    'Salesforce',
    'CRM',
    array['enterprise sales', 'operations', 'admin'],
    array['crm', 'enterprise', 'automation', 'pipeline'],
    '대규모 조직을 위한 엔터프라이즈 CRM 플랫폼',
    'Enterprise',
    'https://www.salesforce.com',
    array['고급 파이프라인', '권한/승인 플로우', 'AppExchange', '보고서'],
    array['확장성과 생태계 강력', '복잡한 프로세스 대응'],
    array['구축/운영 비용 높음', '전담 관리자 필요'],
    true
  ),
  (
    'Pipedrive',
    'CRM',
    array['smb sales', 'founder', 'sales'],
    array['crm', 'pipeline', 'sales'],
    '중소팀을 위한 가벼운 세일즈 파이프라인 CRM',
    'Paid',
    'https://www.pipedrive.com',
    array['딜 파이프라인', '활동 관리', '자동 알림'],
    array['사용이 간단', '영업 집중 기능'],
    array['확장 기능 제한'],
    true
  ),
  (
    'Zoho CRM',
    'CRM',
    array['sales', 'operations'],
    array['crm', 'automation', 'analytics', 'pipeline'],
    '비용 효율형 CRM + 업무 자동화 도구',
    'Freemium',
    'https://www.zoho.com/crm',
    array['리드/딜 관리', '워크플로우 자동화', '분석 대시보드'],
    array['가격 대비 기능 폭넓음'],
    array['UI 학습 필요'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Marketing Automation
  -- ═══════════════════════════════════════
  (
    '스티비 (Stibee)',
    'Marketing Automation',
    array['marketer', 'founder', 'product manager', 'growth'],
    array['email-marketing', 'newsletter', 'campaign', 'automation'],
    '한국 이메일 뉴스레터 발송 1위. 구독자 관리부터 자동화 시나리오까지',
    'Freemium',
    'https://stibee.com',
    array['이메일 에디터', '구독자 세그먼트', '자동화 시나리오', '통계 분석'],
    array['한국어 UI 최적화', '국내 이메일 발송 신뢰도 높음', '무료 1000명 지원'],
    array['SMS/앱 푸시 미지원', '글로벌 발송 대비 기능 단순'],
    true
  ),
  (
    'Notifly (노티플라이)',
    'Marketing Automation',
    array['marketer', 'growth marketer', 'product manager', 'ecommerce marketer'],
    array['customer-engagement', 'automation', 'retention', 'email-marketing', 'push-notification'],
    '앱 푸시·이메일·카카오 알림톡을 한 곳에서 자동화하는 한국형 고객 커뮤니케이션 플랫폼',
    'Paid',
    'https://notifly.tech',
    array['멀티채널 자동화(푸시·메일·카카오)', '이벤트 트리거', '고객 세그먼트', 'A/B 테스트'],
    array['카카오 알림톡 네이티브 연동', '한국 앱 서비스 최적화', '이벤트 기반 정밀 타겟'],
    array['초기 SDK 설치 필요', '소규모 프로젝트엔 비용 부담'],
    true
  ),
  (
    '아임웹 (Imweb)',
    'Marketing Automation',
    array['ecommerce marketer', 'founder', 'marketer', 'smb sales'],
    array['ecommerce', 'online-store', 'marketing', 'automation', 'retention'],
    '국내 이커머스 쇼핑몰 빌더 + 마케팅 자동화 올인원 플랫폼',
    'Paid',
    'https://imweb.me',
    array['쇼핑몰 구축', '네이버·카카오 채널 연동', '주문/정산 관리', '리마케팅'],
    array['국내 결제 PG 완벽 지원', '네이버 쇼핑/카카오 연동 내장', '초기 비용 낮음'],
    array['디자인 자유도 제한', '대형 물량 처리 시 성능 이슈 가능'],
    true
  ),
  (
    'Mailchimp',
    'Marketing Automation',
    array['marketer', 'founder'],
    array['email-marketing', 'campaign', 'automation'],
    '해외 고객 대상 이메일 캠페인 중심 마케팅 자동화 툴',
    'Freemium',
    'https://mailchimp.com',
    array['세그먼트', '자동 시나리오', 'A/B 테스트'],
    array['글로벌 이메일 마케팅 표준', '초기 셋업 쉬움'],
    array['한국 발송 IP 신뢰도 이슈', '고급 시나리오 제한'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Customer Support
  -- ═══════════════════════════════════════
  (
    'Zendesk',
    'Customer Support',
    array['support manager', 'operations'],
    array['ticketing', 'support', 'sla', 'helpdesk'],
    '티켓 기반 고객지원 운영 표준 툴',
    'Suite',
    'https://www.zendesk.com',
    array['티켓/SLA', '지식베이스', '옴니채널 지원'],
    array['운영 성숙도 향상', '기업 지원 기능 풍부'],
    array['설정 복잡도', '비용 부담'],
    true
  ),
  (
    'Freshdesk',
    'Customer Support',
    array['support team', 'startup', 'small team'],
    array['ticketing', 'automation', 'support', 'helpdesk'],
    '중소팀 친화형 고객지원 티켓 시스템',
    'Freemium',
    'https://www.freshworks.com/freshdesk',
    array['티켓 자동화', 'FAQ', 'SLA'],
    array['도입 난이도 낮음', '가격 합리적'],
    array['고급 맞춤 기능 제한'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Internal Tooling
  -- ═══════════════════════════════════════
  (
    'Airtable',
    'Internal Tooling',
    array['ops', 'pm', 'analyst', 'operations'],
    array['database', 'no-code', 'workflow', 'automation'],
    '스프레드시트 감성의 노코드 데이터베이스',
    'Freemium',
    'https://airtable.com',
    array['관계형 테이블', '자동화', '폼/뷰', '인터페이스'],
    array['내부 툴 MVP 구축 빠름'],
    array['복잡한 로직 확장 한계'],
    true
  ),
  (
    'Retool',
    'Internal Tooling',
    array['ops engineer', 'internal tools developer', 'developer'],
    array['internal-tools', 'low-code', 'database', 'automation'],
    '사내 운영 도구를 빠르게 만드는 로우코드 플랫폼',
    'Paid',
    'https://retool.com',
    array['DB/API 연결', '컴포넌트 빌더', '권한 관리'],
    array['개발 생산성 높음'],
    array['라이선스 비용', '벤더 종속성'],
    true
  ),
  (
    '비피움 (Bpium)',
    'Internal Tooling',
    array['operations', 'pm', 'ops', 'founder', 'analyst'],
    array['database', 'no-code', 'crm', 'workflow', 'automation'],
    '한국형 노코드 데이터베이스 + 내부 업무 시스템 빌더',
    'Paid',
    'https://bpium.com',
    array['커스텀 DB 설계', '폼/프로세스 자동화', '팀 권한 관리', '대시보드'],
    array['코딩 없이 사내 시스템 구축', '한국 데이터 보안 규정 준수', '국내 지원 빠름'],
    array['사용자 수 기반 요금', '초기 학습 필요'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Design / Collaboration
  -- ═══════════════════════════════════════
  (
    'Figma',
    'Design Collaboration',
    array['designer', 'product manager', 'developer'],
    array['design', 'collaboration', 'prototyping'],
    '디자인 협업 및 프로토타이핑 플랫폼',
    'Freemium',
    'https://www.figma.com',
    array['실시간 협업', '프로토타입', '디자인 시스템'],
    array['협업 속도 우수'],
    array['대규모 파일 성능 이슈 가능'],
    true
  ),
  (
    'Miro',
    'Collaboration',
    array['product manager', 'consultant', 'team lead', 'operations'],
    array['whiteboard', 'ideation', 'workshop', 'collaboration'],
    '온라인 화이트보드 협업 도구',
    'Freemium',
    'https://miro.com',
    array['브레인스토밍', '워크숍 보드', '템플릿'],
    array['원격 협업에 적합'],
    array['정형 데이터 관리에는 부적합'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Data Analytics
  -- ═══════════════════════════════════════
  (
    'Google Analytics 4',
    'Data Analytics',
    array['marketer', 'analyst', 'founder'],
    array['analytics', 'web', 'events', 'dashboard'],
    '웹/앱 이벤트 분석 도구',
    'Free',
    'https://analytics.google.com',
    array['이벤트 분석', '전환 추적', '세그먼트'],
    array['무료 기반 분석 가능'],
    array['학습 곡선 높음'],
    true
  ),
  (
    '핵클 (Hackle)',
    'Data Analytics',
    array['product manager', 'developer', 'growth', 'analyst', 'founder'],
    array['analytics', 'product-analytics', 'ab-testing', 'dashboard', 'behavior'],
    '한국 스타트업을 위한 A/B 테스트·피처 플래그·제품 분석 성장 플랫폼',
    'Freemium',
    'https://hackle.io',
    array['A/B 테스트', '피처 플래그', '이벤트 트래킹', '퍼널 분석'],
    array['한국어 완전 지원', '빠른 SDK 연동', '국내 레퍼런스 다수'],
    array['글로벌 도구 대비 생태계 작음', '고급 코호트 분석 제한'],
    true
  ),
  (
    'Mixpanel',
    'Data Analytics',
    array['product analyst', 'growth', 'product manager'],
    array['product-analytics', 'funnel', 'retention', 'analytics'],
    '제품 지표 분석과 퍼널 최적화 플랫폼',
    'Freemium',
    'https://mixpanel.com',
    array['퍼널/리텐션', '코호트', '실험 분석'],
    array['제품 개선 인사이트 도출'],
    array['이벤트 설계 품질 의존'],
    true
  ),
  (
    'Amplitude',
    'Data Analytics',
    array['product manager', 'analyst'],
    array['product-analytics', 'behavior', 'analytics', 'dashboard'],
    '행동 데이터 기반 제품 분석 플랫폼',
    'Freemium',
    'https://amplitude.com',
    array['유저 행동 분석', '코호트', '여정 시각화'],
    array['제품 의사결정 강화'],
    array['초기 이벤트 모델링 필요'],
    true
  ),
  (
    'Power BI',
    'Data Analytics',
    array['analyst', 'operations', 'bi engineer'],
    array['dashboard', 'bi', 'visualization', 'analytics'],
    '마이크로소프트 생태계 친화형 BI 대시보드 도구',
    'Paid',
    'https://powerbi.microsoft.com',
    array['리포트/대시보드', '데이터 모델링', '팀 공유'],
    array['MS 제품군과 연동 우수'],
    array['복잡 모델링 학습 필요'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Finance / Accounting
  -- ═══════════════════════════════════════
  (
    '이카운트 ERP (Ecount)',
    'Finance/Accounting',
    array['finance manager', 'startup founder', 'operations', 'ops'],
    array['accounting', 'erp', 'invoicing', 'finance', 'inventory'],
    '한국 중소기업 전용 클라우드 ERP. 회계·재고·영업·인사를 통합 관리',
    'Paid',
    'https://ecount.com',
    array['회계 장부/세금계산서', '재고 관리', '영업 관리', '인사/급여'],
    array['국내 세무/회계 법규 완벽 반영', '저렴한 월정액', '도입 레퍼런스 많음'],
    array['UI가 다소 구식', '모바일 앱 기능 제한'],
    true
  ),
  (
    '캐시노트 (Cashnote)',
    'Finance/Accounting',
    array['small business owner', 'founder', 'operations', 'ops'],
    array['accounting', 'finance', 'expense-tracking', 'invoicing', 'dashboard'],
    '소상공인·스타트업을 위한 매출·지출 자동 집계 및 경영 분석 앱',
    'Freemium',
    'https://cashnote.kr',
    array['카드·계좌 자동 집계', '매출 리포트', '비용 분석', '세금계산서'],
    array['연동 자동화로 입력 최소화', '무료 기본 기능 충분', '스마트폰 앱 완성도'],
    array['대기업 수준 ERP 기능 미흡', '다수 법인 관리 한계'],
    true
  ),
  (
    'QuickBooks',
    'Finance/Accounting',
    array['finance manager', 'startup founder'],
    array['accounting', 'finance', 'invoicing'],
    '글로벌 기준 중소기업 회계 및 청구 도구 (해외 거래 기업용)',
    'Paid',
    'https://quickbooks.intuit.com',
    array['회계 장부', '청구서', '지출 추적'],
    array['글로벌 회계 표준 지원', '외화 처리 편리'],
    array['한국 세무 법규 별도 설정 필요', '원화 처리 불편'],
    true
  ),

  -- ═══════════════════════════════════════
  -- HR / Recruiting
  -- ═══════════════════════════════════════
  (
    '그리팅 (Greeting)',
    'HR/Recruiting',
    array['hr manager', 'recruiter', 'founder', 'startup founder'],
    array['ats', 'hiring', 'recruiting'],
    '한국 스타트업을 위한 채용 파이프라인 ATS. 지원자 관리부터 합격 통보까지',
    'Freemium',
    'https://greeting.hr',
    array['채용 파이프라인', '지원자 DB', '면접 일정', '합격 통보 자동화'],
    array['국내 채용 플랫폼 연동', '스타트업 레퍼런스 다수', '무료 플랜으로 시작 가능'],
    array['대기업 대량 채용에는 기능 부족', '외부 HR 시스템 연동 제한'],
    true
  ),
  (
    '원티드스페이스 (Wanted Space)',
    'HR/Recruiting',
    array['hr manager', 'talent acquisition', 'recruiter', 'founder'],
    array['ats', 'hiring', 'hr', 'recruiting'],
    '원티드 채용 플랫폼 기반 HR 관리 솔루션. 채용부터 온보딩·인사 관리까지',
    'Paid',
    'https://wantedspace.ai',
    array['채용 파이프라인', '인사 정보 관리', '온보딩', '조직도'],
    array['원티드 채용 DB와 연동', '채용·HR 일원화', '한국 IT 기업 선호'],
    array['중소기업 비용 부담', '글로벌 채용은 기능 제한'],
    true
  ),
  (
    'Workable',
    'HR/Recruiting',
    array['hr manager', 'recruiter'],
    array['ats', 'hiring', 'recruiting'],
    '글로벌 채용 파이프라인 운영용 ATS (해외 인재 채용 기업용)',
    'Paid',
    'https://www.workable.com',
    array['채용 파이프라인', '면접 스케줄링', '후보자 DB'],
    array['채용 운영 표준화', '글로벌 구인 플랫폼 연동'],
    array['한국어 UI 미흡', '한국 채용 플랫폼 미연동'],
    true
  ),

  -- ═══════════════════════════════════════
  -- Productivity
  -- ═══════════════════════════════════════
  (
    'Calendly',
    'Productivity',
    array['sales', 'customer success', 'recruiter'],
    array['scheduling', 'calendar', 'automation'],
    '미팅 일정 조율 자동화 도구',
    'Freemium',
    'https://calendly.com',
    array['일정 슬롯 공유', '캘린더 연동', '리마인더 자동화'],
    array['커뮤니케이션 비용 절감'],
    array['복합 워크플로우에는 한계'],
    true
  );
