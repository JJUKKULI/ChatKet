# 🗨️ TCP Socket Chat Application

Network Computing 과목 프로젝트 — Node.js TCP 소켓 기반 채팅 시스템

## 🚀 실행 방법

```bash
# 서버 시작
npm start

# 새 터미널에서 클라이언트 접속
npm run client
```

## 📁 프로젝트 구조

```
chat-project/
├── server/           # 서버 로직
│   ├── server.js         # TCP 서버 부트스트랩
│   ├── socketHandler.js  # 소켓 이벤트 처리
│   ├── clientStore.js    # 접속자 상태 관리
│   ├── commandParser.js  # 명령어 파싱
│   └── utils/
│       ├── broadcast.js      # 메시지 전송 유틸
│       ├── logger.js         # 로깅 유틸
│       └── messageFormatter.js # 메시지 포맷
├── client/
│   └── cli-client.js    # CLI 클라이언트
├── shared/
│   ├── constants.js     # 공통 상수
│   └── protocol.js      # 메시지 프로토콜
└── package.json
```

## 💬 지원 명령어

| 명령어                 | 설명        |
| ---------------------- | ----------- |
| `/nick <이름>`         | 닉네임 설정 |
| `/list`                | 접속자 목록 |
| `/w <닉네임> <메시지>` | 귓속말      |
| `/help`                | 도움말      |
| `/quit`                | 종료        |

## 🛠️ 기술 스택

- **Runtime**: Node.js
- **Transport**: TCP (net module)
- **Protocol**: JSON over newline-delimited stream

```

```

---

## 🐙 Step 4 — GitHub 연결

### 4-1. Git 초기화

```bash
# 현재 폴더를 Git 저장소로 만들기
git init

# Git 사용자 정보 설정 (처음 한 번만)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 4-2. GitHub에서 새 Repository 만들기

1. [github.com](https://github.com) 접속 → 로그인
2. 오른쪽 위 **`+`** 버튼 → **New repository**
3. 아래처럼 설정:

```
Repository name: chat-project
Description: TCP Socket Chat Application - Network Computing
Visibility: ☑ Public (or Private)
❌ Initialize this repository with a README  ← 체크 해제! (이미 우리가 만들었으니)
```

4. **Create repository** 클릭
5. 생성 후 나오는 페이지에서 `HTTPS` 주소 복사 (예: `https://github.com/yourid/chat-project.git`)

### 4-3. 로컬과 GitHub 연결

```bash
# 모든 파일을 스테이징 (커밋 준비)
git add .

# 첫 번째 커밋
git commit -m "feat: initial project scaffold with modular architecture"

# main 브랜치로 설정
git branch -M main

# GitHub 원격 저장소 연결 (복사한 주소로 교체!)
git remote add origin https://github.com/yourid/chat-project.git

# GitHub에 업로드
git push -u origin main
```

### 4-4. 정상 연결 확인

```bash
# 원격 저장소 연결 상태 확인
git remote -v
```

이렇게 나오면 성공:

```
origin  https://github.com/yourid/chat-project.git (fetch)
origin  https://github.com/yourid/chat-project.git (push)
```

---

## ✅ 최종 확인

아래 명령어로 전체 구조가 잘 만들어졌는지 확인:

```bash
# 폴더 구조 확인
ls -R

# Git 상태 확인
git status

# 원격 저장소 확인
git log --oneline
```

---

## 🔄 앞으로의 Git 작업 흐름

매번 코드를 수정하고 GitHub에 올릴 때는 이 3단계만 기억하세요:

```bash
git add .                          # 변경파일 스테이징
git commit -m "feat: 설명"         # 커밋 (변경 기록)
git push                           # GitHub에 업로드
```

> 💡 **커밋 메시지 규칙** (습관 들이면 좋음):
>
> - `feat:` — 새 기능 추가
> - `fix:` — 버그 수정
> - `refactor:` — 코드 구조 개선
> - `docs:` — 문서 수정

---

여기까지 완료되면 **Step 2 (clientStore + 서버 핵심 로직)** 로 넘어갈 준비가 된 겁니다. 막히는 부분이 있으면 어떤 오류 메시지가 나오는지 알려주세요!
