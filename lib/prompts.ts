import type { FigmaFrameData, ScreenType } from "./types";

export function buildAnalysisPrompt(figmaData: FigmaFrameData, screenType: ScreenType): string {
  return `당신은 WPF/C# 전문 시니어 개발자입니다.
아래는 피그마에서 추출한 정확한 디자인 데이터입니다.
이 데이터를 WPF 개발 스펙으로 변환하고 반드시 JSON만 응답하세요.
마크다운 코드블록(\`\`\`) 없이 순수 JSON만 출력하세요.

**중요: 모든 텍스트 값(screen_summary, purpose, usage, xaml_notes, regions.name, states)은 반드시 한국어로 작성하세요.**

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
      "states": ["기본", "포커스", "비활성"]
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
