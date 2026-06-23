# SETUP — A to Z

`jack-eng-talking`을 **0에서 배포까지** 따라 하는 가이드입니다. 순서대로 진행하세요.

---

## 0. 사전 준비물

| 항목 | 버전/비고 | 확인 명령 |
|------|-----------|-----------|
| Node.js | 20.19+ 또는 22.13+ 권장 | `node -v` |
| npm | Node에 포함 | `npm -v` |
| Git | 최신 | `git --version` |
| 브라우저 | **Chrome 권장** (Web Speech 음성 인식/합성 최적) | — |

발급받아야 할 계정/키 (아래 단계에서 자세히):
- **Anthropic API 키** — 대화·교정·토픽 생성에 필요
- **Postgres DB** — Supabase 또는 Neon 무료 티어로 충분

---

## 1. 코드 준비 & 의존성 설치

```bash
cd /Users/jack/git/jack-eng-talking   # 이미 코드가 있는 위치
npm install
```

설치 후 한 번 점검:

```bash
npm test          # 16개 통과해야 정상
npx tsc --noEmit  # 타입 에러 없어야 정상
```

---

## 2. Anthropic API 키 발급

1. https://console.anthropic.com 접속 → 로그인/가입
2. 좌측 **API Keys** → **Create Key**
3. 생성된 `sk-ant-...` 키를 복사 (이 화면을 벗어나면 다시 볼 수 없으니 바로 저장)
4. 결제 수단 등록 (**Billing**) — 사용량 기반 과금. 단일 사용자 일일 사용량은 월 몇 달러 수준
   - 안전장치: Billing에서 **사용량 한도(spend limit)** 를 월 $10 등으로 걸어두는 걸 권장

> 모델: 대화/번역/토픽은 `claude-sonnet-4-6`(저렴·빠름), 교정 리포트는 `claude-opus-4-8`(세션당 1회)로 분리되어 비용이 최적화돼 있습니다.

---

## 3. Postgres 데이터베이스 생성

둘 중 **하나**만 선택하세요. (Supabase 추천 — UI가 쉬움)

### 옵션 A — Supabase

1. https://supabase.com → 가입 → **New project**
2. 프로젝트 이름/리전(서울이면 `Northeast Asia (Seoul)`)·DB 비밀번호 설정 → 생성 (1~2분 소요)
3. 좌측 **Project Settings → Database → Connection string → URI** 복사
4. URI 형태: `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-...pooler.supabase.com:5432/postgres`
   - `[YOUR-PASSWORD]` 부분을 2단계에서 정한 DB 비밀번호로 교체
   - 이 값이 `DATABASE_URL` 입니다

### 옵션 B — Neon

1. https://neon.tech → 가입 → **Create project**
2. 대시보드의 **Connection string** 복사 (`postgresql://...neon.tech/...?sslmode=require`)
   - 이 값이 `DATABASE_URL` 입니다

---

## 4. 환경변수 설정

프로젝트 루트에서:

```bash
cp .env.example .env.local
```

`.env.local`을 열어 4개 값을 채웁니다:

```bash
ANTHROPIC_API_KEY=sk-ant-xxx          # 2단계에서 발급한 키
DATABASE_URL=postgres://...           # 3단계에서 복사한 연결 문자열
APP_PASSPHRASE=골라서-정한-긴-비밀번호   # 앱 /login에서 입력할 암호 (본인만 알면 됨)
CRON_SECRET=또-다른-임의의-긴-문자열      # 매일 토픽 cron 인증용 (아무 랜덤 문자열)
```

> `APP_PASSPHRASE`·`CRON_SECRET`은 그냥 길고 추측 어려운 임의 문자열이면 됩니다.
> 생성 예: `openssl rand -hex 24`

`.env.local`은 `.gitignore`에 의해 깃에 올라가지 않습니다 (비밀 유지).

---

## 5. DB 스키마 반영

`.env.local`이 채워진 상태에서:

```bash
npm run db:push
```

`topics`, `sessions`, `corrections`, `expressions`, `daily_progress` 테이블이 생성됩니다.
Supabase/Neon 대시보드의 Table editor에서 생성 확인 가능합니다.

---

## 6. 로컬 실행

```bash
npm run dev
```

1. 브라우저(Chrome)에서 http://localhost:3000 접속
2. 자동으로 `/login`으로 이동 → `APP_PASSPHRASE`에 넣은 암호 입력
3. 홈에 **오늘의 토픽 카드**가 뜨면 성공 (첫 접속 시 토픽이 즉석 생성됨)
4. 🎙️ 버튼 → 마이크 권한 허용 → 영어로 말하기

---

## 7. 사용법 (매일의 루프)

1. **토픽 확인** — 오늘의 시나리오(피칭/협상/기술설명/네트워킹) + 시드 질문 3 + 목표 표현 5
2. **🎙️ speak** → 말하기 → 인식된 문장이 뜨면 **send**
3. Claude가 답하고 **음성으로 읽어줌**. 답변 옆 **🔁 shadow** 로 따라말하기 연습
4. 막히면 **🆘 이거 영어로?** → 한국어 입력 → 즉시 영어 표현
5. 끝나면 **End & review →** → 교정 리포트(오류·자연스러운 표현·핵심 표현) 확인
6. 세션·교정·표현이 DB에 저장되고 스트릭 🔥 증가

> 마이크가 안 잡히는 브라우저면 자동으로 **텍스트 입력창**으로 전환됩니다 (음성 없이도 사용 가능).

---

## 8. 배포 (Vercel)

> 배포하면 외부(폰 포함) 어디서든 접속 가능. cron이 매일 토픽을 미리 생성.

### 8-1. GitHub에 올리기 (원격이 아직 없다면)

```bash
# GitHub에서 빈 repo 생성 후:
git remote add origin https://github.com/<you>/jack-eng-talking.git
git push -u origin main
```

### 8-2. Vercel 연결

1. https://vercel.com → 가입/로그인 → **Add New → Project**
2. GitHub repo(`jack-eng-talking`) import
3. **Environment Variables** 에 4개 모두 추가:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL`
   - `APP_PASSPHRASE`
   - `CRON_SECRET`
4. **Deploy** 클릭

### 8-3. 프로덕션 DB 스키마 반영 (최초 1회)

로컬에서 프로덕션 `DATABASE_URL`을 임시로 넣고 한 번 실행:

```bash
DATABASE_URL='프로덕션_연결문자열' npm run db:push
```

(또는 Supabase/Neon이 로컬과 같은 DB라면 5단계로 이미 완료된 상태)

### 8-4. Cron 확인

- `vercel.json`에 의해 `/api/cron/daily-topic`가 **매일 18:00 UTC = 한국시간 03:00**에 자동 실행됩니다.
- 이 라우트는 `Authorization: Bearer $CRON_SECRET` 헤더를 검사합니다 (Vercel Cron이 자동으로 붙여줌).
- Vercel 대시보드 **Settings → Cron Jobs**에서 등록·실행 로그 확인 가능.
- 시간을 바꾸려면 `vercel.json`의 `schedule`(크론 표현식) 수정 후 재배포.

---

## 9. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| `DATABASE_URL is not set` | `.env.local` 누락 또는 `npm run dev` 재시작 안 함. 값 확인 후 서버 재시작 |
| `ANTHROPIC_API_KEY is not set` | 위와 동일. 키 오타·따옴표 확인 |
| 🎙️ 버튼이 없고 텍스트 입력만 뜸 | 브라우저가 Web Speech 미지원. **Chrome** 사용 권장 (iOS Safari는 부분 지원) |
| 마이크가 안 들림 | 브라우저 주소창의 마이크 권한 허용 확인. `http://localhost`/HTTPS에서만 동작 |
| 음성이 안 읽힘(TTS) | 일부 브라우저는 사용자 상호작용 후에만 재생. 버튼 한 번 클릭 후 재시도 |
| 로그인이 계속 튕김 | `APP_PASSPHRASE` 값과 입력값 불일치. 공백·오타 확인 |
| "API Error" / 일시적 실패 | Anthropic 또는 네트워크 일시 오류. 잠시 후 재시도 |
| cron이 안 도는 듯 | Vercel Cron은 **프로덕션 배포에서만** 동작(프리뷰 X). 대시보드 Cron Jobs 로그 확인 |
| DB 변경이 반영 안 됨 | 스키마 수정 후 `npm run db:push` 재실행 |

수동으로 토픽 생성을 테스트하려면 (배포 후):

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>.vercel.app/api/cron/daily-topic
```

---

## 10. 비용 관리

- 단일 사용자 일일 사용: 대화는 Sonnet, 교정은 세션당 Opus 1회 → **월 몇 달러** 수준
- Anthropic Console **Billing → Usage limits**에 월 상한선 설정 권장
- Supabase/Neon 무료 티어로 단일 사용자 트래픽은 충분

---

## 11. 다음 단계 (로드맵 — 아직 미구현)

데이터 모델에는 이미 반영돼 있어 점진적으로 추가 가능:

1. **표현 SRS 암기** — 저장된 `expressions`를 간격반복 플래시카드로
2. **발음 점수** — Whisper 기반 정밀 발음 피드백 (브라우저 STT를 opt-in 경로로 교체)
3. **영상 추천** — 매일 큐레이션된 섀도잉용 영상

설계·계획 문서: `docs/superpowers/specs/`, `docs/superpowers/plans/`
