# figma → WPF

피그마 프레임 URL을 입력하면 WPF/C# 개발자에게 필요한 **스펙 문서 · XAML 뼈대 · ResourceDictionary**를 자동으로 생성하는 핸드오프 도구입니다.

---

## 주요 기능

- 피그마 링크 하나로 디자인 데이터 추출 (스크린샷 불필요)
- 추정값 없이 실제 px, HEX, 폰트 정보 사용
- Gemini AI가 WPF 구조로 해석 및 변환
- 스펙 문서(MD) + XAML 뼈대 + ResourceDictionary 동시 생성
- ZIP 파일로 한 번에 다운로드

---

## 데이터 흐름

```
피그마 프레임 URL 입력
        ↓
Figma REST API
→ 노드 트리, 컬러, 폰트, 간격 추출
        ↓
Gemini 2.5 Flash (AI 분석)
→ Figma JSON을 WPF 구조로 해석
        ↓
출력: 스펙 문서(MD) + XAML 뼈대 + ResourceDictionary
```

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| AI | Google Gemini 2.5 Flash |
| Figma 연동 | Figma REST API |
| File export | jszip |

---

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/nevermind73-cell/figma-to-wpf.git
cd figma-to-wpf
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 값을 입력합니다.

```env
GEMINI_API_KEY=여기에_Gemini_API_키_입력
FIGMA_API_TOKEN=여기에_피그마_토큰_입력
```

**Gemini API 키 발급**: [Google AI Studio](https://aistudio.google.com/app/apikey)

**피그마 API 토큰 발급**:
```
Figma 접속 → 우측 상단 프로필 → Settings
→ Account 탭 → Personal Access Tokens → Generate new token
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 사용 방법

1. 피그마에서 분석할 **프레임을 선택**
2. 우클릭 → **Copy link** 로 URL 복사
3. 도구에 URL 붙여넣기
4. 화면 유형 선택 (폼 / 다이얼로그 / 대시보드 / 목록 / 기타)
5. 출력 형식 선택 (스펙 문서 / XAML / ResourceDictionary)
6. **분석 시작** 클릭

### 피그마 URL 형식

```
https://www.figma.com/file/[FILE_KEY]/[파일명]?node-id=[NODE_ID]
```

> node-id가 포함된 URL이어야 합니다. 프레임을 선택한 후 링크를 복사해야 node-id가 포함됩니다.

---

## 출력 예시

### XAML 뼈대

```xml
<Window x:Class="App.Views.LoginView"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="로그인">
  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <!-- [Input/Email]: 이메일 입력 -->
    <TextBox Grid.Row="0" Width="280" Height="36" Margin="0,0,0,8"/>

    <!-- [Button/Login]: 로그인 버튼 -->
    <Button Grid.Row="1" Width="280" Height="44" Margin="0,16,0,0"/>
  </Grid>
</Window>
```

### ResourceDictionary

```xml
<ResourceDictionary ...>
  <!-- Colors (피그마 원본값) -->
  <Color x:Key="PrimaryColor">#3B82F6</Color>
  <SolidColorBrush x:Key="PrimaryColorBrush" Color="{StaticResource PrimaryColor}"/>

  <!-- Spacing -->
  <sys:Double x:Key="Spacing8">8</sys:Double>
  <Thickness x:Key="Margin16">16</Thickness>
</ResourceDictionary>
```

---

## 폴더 구조

```
figma-to-wpf/
├── app/
│   ├── page.tsx                  # 메인: URL 입력 화면
│   ├── result/page.tsx           # 결과: 탭 UI
│   ├── api/analyze/route.ts      # Figma API + Gemini 연동
│   └── layout.tsx
├── lib/
│   ├── figma-parser.ts           # Figma JSON → 정규화 구조
│   ├── prompts.ts                # Gemini 프롬프트
│   ├── xaml-generator.ts         # XAML / ResourceDictionary / 스펙 MD 생성
│   └── types.ts                  # 공통 TypeScript 타입
├── components/
│   ├── UrlInput.tsx              # URL 입력 폼
│   ├── ResultTabs.tsx            # 결과 탭
│   └── CodeBlock.tsx             # 코드 표시 + 복사/다운로드
└── .env.local                    # API 키 (git 제외)
```

---

## 에러 처리

| 상황 | 메시지 |
|---|---|
| node-id 없는 URL | 프레임을 선택 후 링크를 복사해주세요 |
| 잘못된 파일 키 | 피그마 파일을 찾을 수 없습니다 |
| 토큰 권한 없음 | 파일 접근 권한이 없습니다. 피그마 토큰을 확인해주세요 |
| API 한도 초과 | Gemini API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요 |

---

## 주의사항

- `.env.local` 파일은 절대 커밋하지 마세요 (`.gitignore`에 포함됨)
- Figma 파일이 공개(Public)이거나 토큰에 접근 권한이 있어야 합니다
- Gemini 무료 티어: 분당 15회, 일 1,500회 요청 가능
