# 피그마 → WPF 핸드오프 도구 (figma-to-wpf)

Claude Code에서 이 파일을 읽고 프로젝트를 시작하세요.
모든 코드 작성 전에 이 문서의 규칙을 따르세요.

> AI 엔진: Google Gemini API (gemini-2.5-flash)

---

## 프로젝트 개요

**목적**: 피그마 프레임 URL을 입력하면 Figma MCP로 디자인 데이터를 직접 추출하고,
Claude가 WPF/C# 개발자에게 필요한 스펙 문서, XAML 뼈대, ResourceDictionary를 자동 생성하는 도구

**사용자**: 기획자(URL 입력) → 개발자(결과물 수령)

**핵심 가치**:
- 스크린샷 없이 피그마 링크 하나로 정확한 값 추출
- 추정값 없이 실제 px, HEX, 폰트 정보 사용
- 개발자가 바로 사용할 수 있는 XAML 뼈대 제공

---

## 데이터 흐름

```
피그마 프레임 URL 입력
        ↓
Figma MCP (get_figma_data)
→ 노드 트리, 컬러, 폰트, 간격, 컴포넌트 정보 추출
        ↓
Claude API (텍스트 분석)
→ Figma JSON을 WPF 구조로 해석 및 변환
        ↓
출력: 스펙 문서(MD) + XAML 뼈대 + ResourceDictionary
```

> 스크린샷 방식과의 차이: Claude Vision(이미지 추정) 대신
> Figma MCP(정확한 데이터)를 사용하므로 추정값이 없고 정확도가 높습니다.

---

## 기술 스택

```
Framework    : Next.js 14 (App Router)
Language     : TypeScript (strict mode)
Styling      : Tailwind CSS
AI           : @google/generative-ai (Gemini API)
Figma 연동   : Figma MCP (figma-developer-mcp)
File export  : jszip
Package mgr  : npm
Node version : 18+
```

**사용하지 않는 것**: 이미지 업로드, Prisma, Supabase, 인증 (DB 없음, 로그인 없음)

---

## Figma MCP 사전 설정 (개발 시작 전 필수)

### 1. 피그마 API 토큰 발급

```
Figma 접속 → 우측 상단 프로필 → Settings
→ Account 탭 → Personal Access Tokens
→ Generate new token → 토큰 복사
```

### 2. Claude Code MCP 설정 파일 편집

```bash
# 파일 위치 (없으면 생성)
~/.claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp"],
      "env": {
        "FIGMA_API_TOKEN": "여기에_피그마_토큰_붙여넣기"
      }
    }
  }
}
```

### 3. 설정 확인

Claude Code를 재시작한 후 아래 명령으로 확인:
```
"Figma MCP가 연결됐는지 확인해줘"
```

### 4. 피그마 URL 구조 이해

```
https://www.figma.com/file/[FILE_KEY]/[파일명]?node-id=[NODE_ID]

예시:
https://www.figma.com/file/ABC123DEF456/MyApp?node-id=1-23

FILE_KEY  : ABC123DEF456
NODE_ID   : 1-23 (프레임 선택 후 우클릭 → Copy link로 획득)
```

---

## 폴더 구조

```
figma-to-wpf/
├── app/
│   ├── page.tsx                  # 메인: URL 입력 화면
│   ├── result/
│   │   └── page.tsx              # 결과: 탭 UI (스펙/XAML/Resource)
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # Figma MCP 호출 + Gemini 변환
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── figma-parser.ts           # Figma JSON → 정규화된 내부 구조
│   ├── prompts.ts                # Gemini 프롬프트 정의
│   ├── xaml-generator.ts         # 내부 구조 → XAML 변환
│   └── types.ts                  # 공통 TypeScript 타입
├── components/
│   ├── UrlInput.tsx              # 피그마 URL + 프레임명 입력폼
│   ├── ResultTabs.tsx            # 결과 탭 컴포넌트
│   └── CodeBlock.tsx             # 코드 표시 + 복사 버튼
├── public/
├── .env.local                    # API 키 (git 제외)
├── .gitignore
├── CLAUDE.md                     # 이 파일
└── package.json
```

---

## 환경 변수

```bash
# .env.local
GEMINI_API_KEY=your_gemini_api_key
FIGMA_API_TOKEN=your_figma_api_token
```

> `.env.local`은 반드시 `.gitignore`에 포함할 것.
> Figma MCP는 Claude Code 내부에서 직접 호출되므로
> API Route에서는 FIGMA_API_TOKEN으로 REST API를 직접 호출하는 방식 사용.

---

## 핵심 타입 정의

`lib/types.ts`에 아래 타입을 먼저 정의하고 전체에서 공유한다.

```typescript
// 입력
export type ScreenType = "form" | "dialog" | "dashboard" | "list" | "other";
export type OutputType = "spec" | "xaml" | "resource";

export interface AnalyzeRequest {
  figmaUrl: string;       // 전체 피그마 URL
  fileKey: string;        // URL에서 파싱
  nodeId: string;         // URL에서 파싱
  screenType: ScreenType;
  outputTypes: OutputType[];
}

// Figma MCP에서 받아오는 정규화된 구조
export interface FigmaFrameData {
  frameName: string;
  width: number;
  height: number;
  nodes: FigmaNode[];
  colors: FigmaColor[];
  fonts: FigmaFont[];
  spacings: number[];
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;           // FRAME, RECTANGLE, TEXT, COMPONENT 등
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: FigmaFill[];
  strokes?: FigmaFill[];
  cornerRadius?: number;
  fontSize?: number;
  fontName?: { family: string; style: string };
  characters?: string;    // 텍스트 노드의 실제 내용
  children?: FigmaNode[];
  constraints?: {
    horizontal: string;   // LEFT, RIGHT, CENTER, SCALE, STRETCH
    vertical: string;
  };
}

export interface FigmaColor {
  name: string;
  hex: string;
  usage: string;          // 어느 노드에서 사용됐는지
}

export interface FigmaFont {
  family: string;
  style: string;
  size: number;
  usageCount: number;
}

export interface FigmaFill {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
}

// 최종 분석 결과
export interface AnalysisResult {
  screen_summary: string;
  layout: {
    type: "Grid" | "DockPanel" | "StackPanel";
    rows: string[];
    columns: string[];
    regions: {
      name: string;
      row: number | string;
      col: number | string;
      height?: string;
    }[];
  };
  components: {
    wpf_control: string;
    purpose: string;
    layer_name: string;   // 피그마 레이어명
    width: string;
    height: string;
    margin: string;
    states: string[];
  }[];
  design_tokens: {
    colors: {
      name: string;
      hex: string;        // 피그마에서 추출한 정확한 값
      usage: string;
    }[];
    fonts: {
      family: string;
      sizes: number[];
      weights: number[];
    }[];
    spacing: number[];
  };
  xaml_notes: string;
}
```

---

## Figma 데이터 파싱 규칙

`lib/figma-parser.ts`

Figma MCP가 반환하는 raw JSON을 `FigmaFrameData` 타입으로 정규화한다.

```typescript
// lib/figma-parser.ts 핵심 함수

// RGBA (0-1 범위) → HEX 변환
export function rgbaToHex(color: { r: number; g: number; b: number }): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
}

// Figma 노드 타입 → WPF 컨트롤명 추론
export function inferWpfControl(node: FigmaNode): string {
  const name = node.name.toLowerCase();
  const type = node.type;

  if (type === "TEXT") return "TextBlock";
  if (name.includes("input") || name.includes("textbox")) return "TextBox";
  if (name.includes("button") || name.includes("btn")) return "Button";
  if (name.includes("dropdown") || name.includes("select") || name.includes("combo")) return "ComboBox";
  if (name.includes("checkbox") || name.includes("check")) return "CheckBox";
  if (name.includes("radio")) return "RadioButton";
  if (name.includes("table") || name.includes("grid") || name.includes("datagrid")) return "DataGrid";
  if (name.includes("list")) return "ListBox";
  if (name.includes("tab")) return "TabControl";
  if (name.includes("image") || name.includes("icon") || name.includes("img")) return "Image";
  if (name.includes("divider") || name.includes("separator")) return "Separator";
  if (type === "FRAME" || type === "COMPONENT") return "UserControl";
  return "Border"; // 기본값
}

// Figma constraints → WPF HorizontalAlignment/VerticalAlignment
export function constraintToAlignment(constraint: string): string {
  const map: Record<string, string> = {
    LEFT: "Left", RIGHT: "Right", CENTER: "Center",
    SCALE: "Stretch", STRETCH: "Stretch",
    TOP: "Top", BOTTOM: "Bottom",
  };
  return map[constraint] ?? "Left";
}

// 간격값을 4px 단위로 정규화
export function normalizeSpacing(value: number): number {
  return Math.round(value / 4) * 4;
}
```

---

## API Route 규칙

`app/api/analyze/route.ts`

### 처리 흐름

```
1. 요청에서 figmaUrl, screenType, outputTypes 파싱
2. figmaUrl에서 fileKey, nodeId 추출
3. Figma REST API로 노드 데이터 직접 요청
   (MCP는 Claude Code 내부용 → 앱 서버에서는 REST API 직접 호출)
4. figma-parser.ts로 정규화
5. Gemini API로 WPF 구조 해석 요청
6. xaml-generator.ts로 XAML, ResourceDictionary, 스펙 MD 생성
7. JSON 응답 반환
```

### 피그마 URL 파싱 함수

```typescript
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
  // https://www.figma.com/file/[FILE_KEY]/...?node-id=[NODE_ID]
  const fileKeyMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  const nodeIdMatch = url.match(/node-id=([^&]+)/);

  if (!fileKeyMatch) throw new Error("피그마 파일 키를 찾을 수 없습니다");
  if (!nodeIdMatch) throw new Error("node-id가 없습니다. 프레임을 선택 후 링크를 복사해주세요");

  return {
    fileKey: fileKeyMatch[1],
    nodeId: decodeURIComponent(nodeIdMatch[1]),
  };
}
```

### Figma REST API 호출

```typescript
// 피그마 노드 데이터 가져오기
async function fetchFigmaNode(fileKey: string, nodeId: string) {
  const res = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`,
    { headers: { "X-Figma-Token": process.env.FIGMA_API_TOKEN! } }
  );
  if (!res.ok) throw new Error(`Figma API 오류: ${res.status}`);
  return res.json();
}
```

### Gemini API 호출 코드

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function analyzeWithGemini(figmaData: FigmaFrameData, screenType: ScreenType) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = buildAnalysisPrompt(figmaData, screenType);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSON 파싱 (마크다운 코드블록 제거 후)
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as AnalysisResult;
}
```

### HTTP 스펙

- Method: POST
- Content-Type: application/json
- 입력: `{ figmaUrl, screenType, outputTypes }`
- 응답: `{ analysis, xaml, resourceDict, specMarkdown }`
- 에러: try/catch, 400/500 상태코드 반환

---

## Gemini 프롬프트 규칙

`lib/prompts.ts`

스크린샷 방식과 달리 **추정 없이 정확한 값 기반**으로 변환만 수행한다.

```typescript
export function buildAnalysisPrompt(
  figmaData: FigmaFrameData,
  screenType: ScreenType
): string {
  return `당신은 WPF/C# 전문 시니어 개발자입니다.
아래는 피그마에서 추출한 정확한 디자인 데이터입니다.
이 데이터를 WPF 개발 스펙으로 변환하고 반드시 JSON만 응답하세요.
마크다운 코드블록(\`\`\`) 없이 순수 JSON만 출력하세요.

화면 유형: ${screenType}
프레임 크기: ${figmaData.width} × ${figmaData.height}px

## 변환 규칙
- 모든 수치는 피그마 원본값 그대로 사용 (추정 없음)
- 컬러는 제공된 HEX 값 그대로 사용
- 폰트 패밀리/사이즈는 제공된 값 그대로 사용
- 노드 이름(layer_name)은 피그마 레이어명 그대로 기록
- constraints(Left/Right/Center/Stretch)를 WPF HorizontalAlignment로 변환
- fills의 RGBA → 이미 HEX로 변환된 값 사용

## Figma 노드 → WPF 컨트롤 변환 기준
TEXT 노드 → TextBlock
input/textbox 포함 이름 → TextBox
button/btn 포함 이름 → Button
dropdown/select/combo 포함 이름 → ComboBox
checkbox/check 포함 이름 → CheckBox
radio 포함 이름 → RadioButton
table/grid/datagrid 포함 이름 → DataGrid
list 포함 이름 → ListBox
tab 포함 이름 → TabControl
image/icon/img 포함 이름 → Image
FRAME/COMPONENT → UserControl 또는 Border
divider/separator → Separator

## 피그마 데이터
${JSON.stringify(figmaData, null, 2)}

## 응답 JSON 형식
{
  "screen_summary": "이 화면이 하는 일을 1문장으로",
  "layout": {
    "type": "Grid",
    "rows": ["Auto", "*", "Auto"],
    "columns": ["*"],
    "regions": [
      { "name": "헤더", "row": 0, "col": "0", "height": "56" }
    ]
  },
  "components": [
    {
      "wpf_control": "TextBox",
      "purpose": "이메일 입력",
      "layer_name": "Input/Email",
      "width": "280",
      "height": "36",
      "margin": "0,0,0,8",
      "horizontal_alignment": "Stretch",
      "states": ["Default", "Focus", "Disabled"]
    }
  ],
  "design_tokens": {
    "colors": [
      { "name": "PrimaryColor", "hex": "#3B82F6", "usage": "Button/Primary 배경" }
    ],
    "fonts": [
      { "family": "Pretendard", "sizes": [12, 14, 16], "weights": [400, 500, 700] }
    ],
    "spacing": [4, 8, 16, 24]
  },
  "xaml_notes": "개발자 주의사항 및 특이 구현 항목"
}`;
}
```

---

## 화면 구성

### 메인 페이지 (`app/page.tsx`)

```
┌──────────────────────────────────────────┐
│  figma → WPF                             │
│  피그마 프레임을 WPF 개발 스펙으로 변환  │
├──────────────────────────────────────────┤
│                                          │
│  피그마 프레임 URL                       │
│  [https://www.figma.com/file/...      ]  │
│  ℹ 프레임 선택 후 우클릭 → Copy link    │
│                                          │
│  화면 유형                               │
│  [Form ▼]                               │
│                                          │
│  출력 형식                               │
│  [✓] 스펙 문서  [✓] XAML  [✓] ResourceDictionary │
│                                          │
│  [     분석 시작     ]                   │
└──────────────────────────────────────────┘
```

### 결과 페이지 (`app/result/page.tsx`)

```
┌──────────────────────────────────────────┐
│  ← 새 화면 분석                          │
│                                          │
│  로그인 폼 (Login/Frame) 분석 결과       │
│                                          │
│  [스펙 문서] [XAML 뼈대] [ResourceDictionary] │
├──────────────────────────────────────────┤
│                                          │
│  (선택된 탭 내용)                        │
│  코드 또는 마크다운 렌더링               │
│                           [복사] [다운로드] │
│                                          │
├──────────────────────────────────────────┤
│  [전체 ZIP 다운로드]                     │
└──────────────────────────────────────────┘
```

---

## XAML 생성 규칙

`lib/xaml-generator.ts`

- `generateXaml(analysis: AnalysisResult): string`
- `generateResourceDictionary(tokens): string`
- `generateSpecMarkdown(analysis: AnalysisResult): string`

```typescript
// ResourceDictionary 헤더 (반드시 이 형식 사용)
const RESOURCE_DICT_HEADER = `<ResourceDictionary
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:sys="clr-namespace:System;assembly=mscorlib">`;

// 컬러 리소스 (피그마 원본 HEX 그대로)
// <Color x:Key="PrimaryColor">#3B82F6</Color>
// <SolidColorBrush x:Key="PrimaryBrush" Color="{StaticResource PrimaryColor}"/>

// 간격 리소스
// <sys:Double x:Key="Spacing8">8</sys:Double>
// <Thickness x:Key="DefaultMargin">0,0,0,8</Thickness>

// XAML 뼈대 주석 형식
// <!-- [피그마 레이어명]: [컨트롤 용도] -->
// <!-- Width: 280px (피그마 원본값) -->
```

---

## 개발 단계

### 0단계: 사전 준비 (Day 0 — 개발 시작 전)

```bash
# 1. 피그마 API 토큰 발급
# Figma → Settings → Personal Access Tokens → Generate

# 2. MCP 설정
cat ~/.claude/claude_desktop_config.json
# 없으면 생성, figma 서버 추가 (상단 MCP 설정 참고)

# 3. Claude Code 재시작 후 확인
# "Figma MCP가 연결됐는지 확인해줘"
```

완료 기준:
- [ ] 피그마 API 토큰 발급 완료
- [ ] MCP 설정 파일 저장 완료
- [ ] Claude Code에서 Figma MCP 연결 확인

---

### 1단계: 프로젝트 초기화 (Day 1)

```bash
npx create-next-app figma-to-wpf \
  --typescript --tailwind --app --no-src-dir
cd figma-to-wpf
npm install @google/generative-ai jszip
```

```bash
# 폴더 구조 생성
mkdir -p lib components app/result app/api/analyze
```

완료 기준:
- [ ] `npm run dev` 정상 실행
- [ ] `.env.local` 생성 (GEMINI_API_KEY, FIGMA_API_TOKEN)
- [ ] `lib/types.ts` 타입 정의 완료
- [ ] `lib/figma-parser.ts` 파싱 함수 완료

---

### 2단계: 메인 UI (Day 2-3)

구현 순서:
1. `components/UrlInput.tsx` — URL 입력 + 유효성 검사
2. `app/page.tsx` — 화면 유형, 출력 형식 선택, 분석 버튼
3. URL에서 fileKey, nodeId 파싱 함수
4. 로딩 상태 (분석 중 스피너 + "피그마 데이터 불러오는 중...")

완료 기준:
- [ ] URL 입력 및 유효성 검사 (figma.com 도메인, node-id 포함 여부)
- [ ] fileKey, nodeId 파싱 정상 동작
- [ ] 화면 유형/출력 형식 선택 작동
- [ ] 로딩 상태 표시

---

### 3단계: Figma API + Gemini 연결 (Day 4-6)

구현 순서:
1. `app/api/analyze/route.ts` — Figma REST API 호출
2. `lib/figma-parser.ts` — raw JSON 정규화 완성
3. `lib/prompts.ts` — 전체 프롬프트 작성
4. Gemini API 연결 및 JSON 파싱
5. 에러 처리 (잘못된 URL, 권한 없는 파일, API 오류)

완료 기준:
- [ ] Figma API 호출 성공
- [ ] FigmaFrameData 정규화 성공
- [ ] Gemini API JSON 응답 파싱 성공
- [ ] 에러 케이스 처리 (토큰 오류, 파일 없음, 권한 없음)

---

### 4단계: 결과 변환 및 표시 (Day 7-9)

구현 순서:
1. `lib/xaml-generator.ts` — XAML, ResourceDictionary, 스펙 MD 생성
2. `components/CodeBlock.tsx` — 코드 표시 + 복사 버튼
3. `components/ResultTabs.tsx` — 탭 UI
4. `app/result/page.tsx` — 결과 페이지 조립

완료 기준:
- [ ] 3개 탭 전환 작동
- [ ] 피그마 레이어명이 XAML 주석에 표시
- [ ] 복사 버튼 클립보드 작동
- [ ] 개별 파일 다운로드 작동

---

### 5단계: ZIP 다운로드 및 실전 테스트 (Day 10-12)

구현 순서:
1. `jszip`으로 ZIP 생성 (스펙.md + 화면명.xaml + ResourceDictionary.xaml)
2. 실제 피그마 화면 3개 이상 테스트
3. 프롬프트 튜닝 (결과 품질 개선)
4. 개발팀 피드백 반영

완료 기준:
- [ ] ZIP 다운로드 정상 동작
- [ ] 파일명이 피그마 프레임명으로 자동 설정
- [ ] 실제 회사 화면 테스트 통과
- [ ] 개발팀에서 XAML 바로 사용 가능 수준 확인

---

## 코딩 규칙

- TypeScript strict mode, `any` 사용 금지
- 컴포넌트는 함수형, export default
- API Route는 try/catch 필수, 에러 메시지 한국어로
- 상태 관리: useState만 사용 (외부 상태관리 라이브러리 없음)
- 파일명: 컴포넌트는 PascalCase, 유틸은 camelCase
- 주석: 복잡한 로직에만 한국어로 작성
- Figma API 응답 raw 데이터는 절대 프론트엔드로 전달하지 않음

---

## 에러 처리 기준

| 상황 | 에러 메시지 | HTTP 코드 |
|---|---|---|
| node-id 없는 URL | "프레임을 선택 후 링크를 복사해주세요" | 400 |
| 잘못된 파일 키 | "피그마 파일을 찾을 수 없습니다" | 404 |
| 토큰 권한 없음 | "파일 접근 권한이 없습니다. 피그마 토큰을 확인해주세요" | 403 |
| Gemini API 오류 | "분석 중 오류가 발생했습니다. 다시 시도해주세요" | 500 |
| JSON 파싱 실패 | "응답 파싱에 실패했습니다. 다시 시도해주세요" | 500 |

---

## Gemini API 무료 티어 한도

| 항목 | 무료 한도 |
|---|---|
| 모델 | gemini-2.5-flash |
| 분당 요청 수 | 15회 |
| 일일 요청 수 | 1,500회 |
| 입력 토큰 | 100만 토큰/분 |

개발·테스트 수준에서는 무료 티어로 충분합니다.
한도 초과 시 `429 Resource Exhausted` 에러가 나므로 에러 처리에 포함할 것.

---

## 자주 쓰는 Claude Code 프롬프트 예시

```bash
# 초기 세팅
"CLAUDE.md를 읽고 0단계 사전 준비가 완료됐는지 확인해줘.
그리고 1단계 프로젝트 초기화를 시작해줘."

# Figma 파서 작성
"lib/figma-parser.ts를 만들어줘.
CLAUDE.md의 타입 정의와 파싱 함수 규칙을 따라서
Figma REST API 응답을 FigmaFrameData 타입으로 정규화해줘."

# API Route 작성
"app/api/analyze/route.ts를 만들어줘.
CLAUDE.md의 처리 흐름대로
Figma REST API → figma-parser → Gemini API 순서로 구현해줘."

# 프롬프트 개선
"lib/prompts.ts의 프롬프트를 수정해줘.
Grid rows/columns 추론이 부정확해.
피그마 노드의 y좌표와 height 값으로
RowDefinitions를 더 정확하게 생성하도록 개선해줘."

# 버그 수정
"Figma API에서 컬러가 RGBA로 오는데
rgbaToHex 변환 후 ResourceDictionary에 반영이 안 돼.
figma-parser.ts와 xaml-generator.ts를 같이 확인해줘."
```

---

## 시작하기

```bash
# Step 1. 피그마 토큰 발급 및 MCP 설정 (0단계 참고)

# Step 2. 프로젝트 생성
npx create-next-app figma-to-wpf --typescript --tailwind --app --no-src-dir
cd figma-to-wpf

# Step 3. 패키지 설치
npm install @google/generative-ai jszip

# Step 4. 환경 변수 설정
echo "GEMINI_API_KEY=여기에_Gemini_API_키" >> .env.local
echo "FIGMA_API_TOKEN=여기에_피그마_토큰" >> .env.local

# Step 5. 이 파일을 프로젝트 루트에 복사
# CLAUDE.md → figma-to-wpf/CLAUDE.md

# Step 6. 개발 시작
npm run dev
```

준비 완료. Claude Code에서 아래 명령으로 시작하세요:

```
"CLAUDE.md를 읽고 0단계부터 시작해줘"
```
