import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createOrGetUser(email, password) {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200
  });

  if (listError) {
    throw new Error(listError.message);
  }

  const existing = listData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "사용자 생성 실패");
  }

  return data.user;
}

async function main() {
  const userEmail = process.env.TEST_USER_EMAIL ?? "user@example.com";
  const userPassword = process.env.TEST_USER_PASSWORD ?? "UserPass123!";
  const makerEmail = process.env.TEST_MAKER_EMAIL ?? "maker@example.com";
  const makerPassword = process.env.TEST_MAKER_PASSWORD ?? "MakerPass123!";

  const user = await createOrGetUser(userEmail, userPassword);
  const maker = await createOrGetUser(makerEmail, makerPassword);

  const { error: userProfileError } = await supabase.from("profiles").upsert({
    id: user.id,
    role: "USER",
    full_name: "테스트 사용자",
    job_title: "Operations Manager",
    industry: "SaaS",
    onboarding_completed: false
  });
  if (userProfileError) {
    throw new Error(userProfileError.message);
  }

  const { error: makerProfileError } = await supabase.from("profiles").upsert({
    id: maker.id,
    role: "MAKER",
    full_name: "테스트 메이커",
    job_title: "Fullstack Developer",
    industry: "Software",
    onboarding_completed: true
  });
  if (makerProfileError) {
    throw new Error(makerProfileError.message);
  }

  const { error: makerDetailError } = await supabase.from("maker_profiles").upsert({
    user_id: maker.id,
    display_name: "Verified Maker Kim",
    headline: "B2B 내부 도구 구축 전문",
    bio: "프로세스 자동화와 운영 도구를 주로 개발합니다.",
    skills: ["Next.js", "Supabase", "Automation"],
    portfolio_links: ["https://example.com/portfolio/1", "https://example.com/portfolio/2"],
    is_verified: true,
    verification_badge: "Verified Maker"
  });

  if (makerDetailError) {
    throw new Error(makerDetailError.message);
  }

  console.log("테스트 계정 준비 완료");
  console.log(`USER  : ${userEmail} / ${userPassword}`);
  console.log(`MAKER : ${makerEmail} / ${makerPassword}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
