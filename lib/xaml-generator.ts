import type { AnalysisResult } from "./types";

const RESOURCE_DICT_HEADER = `<ResourceDictionary
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:sys="clr-namespace:System;assembly=mscorlib">`;

export function generateXaml(analysis: AnalysisResult, frameName: string): string {
  const layout = analysis.layout ?? { type: "Grid", rows: ["*"], columns: ["*"], regions: [] };
  const components = analysis.components ?? [];

  const rows = layout.rows ?? ["*"];
  const columns = layout.columns ?? ["*"];
  const regions = layout.regions ?? [];

  const rowDefs = rows
    .map((r) => `        <RowDefinition Height="${r}"/>`)
    .join("\n");

  const colDefs = columns
    .map((c) => `        <ColumnDefinition Width="${c}"/>`)
    .join("\n");

  const componentXaml = components
    .map((comp, i) => {
      const row = i < regions.length ? i : 0;
      const size =
        comp.width === "Auto" || comp.width === "*"
          ? `HorizontalAlignment="${comp.horizontal_alignment ?? "Stretch"}"`
          : `Width="${comp.width}" Height="${comp.height}"`;
      return `
    <!-- [${comp.layer_name}]: ${comp.purpose} -->
    <${comp.wpf_control}
        Grid.Row="${row}" Grid.Column="0"
        ${size}
        Margin="${comp.margin ?? "0"}"
        HorizontalAlignment="${comp.horizontal_alignment ?? "Left"}">
    </${comp.wpf_control}>`;
    })
    .join("\n");

  const windowWidth = regions[0]?.height ?? "Auto";

  return `<Window x:Class="App.Views.${frameName.replace(/\s/g, "")}View"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="${frameName}"
    Width="${windowWidth}"
    Height="Auto">
  <Window.Resources>
    <ResourceDictionary>
      <ResourceDictionary.MergedDictionaries>
        <ResourceDictionary Source="ResourceDictionary.xaml"/>
      </ResourceDictionary.MergedDictionaries>
    </ResourceDictionary>
  </Window.Resources>

  <Grid>
    <Grid.RowDefinitions>
${rowDefs}
    </Grid.RowDefinitions>
    <Grid.ColumnDefinitions>
${colDefs}
    </Grid.ColumnDefinitions>
${componentXaml}
  </Grid>
</Window>`;
}

export function generateResourceDictionary(analysis: AnalysisResult): string {
  const tokens = analysis.design_tokens ?? { colors: [], fonts: [], spacing: [] };
  const colors = tokens.colors ?? [];
  const fonts = tokens.fonts ?? [];
  const spacing = tokens.spacing ?? [4, 8, 16, 24];

  const colorResources = colors
    .map(
      (c) =>
        `  <Color x:Key="${c.name}">${c.hex}</Color>\n  <SolidColorBrush x:Key="${c.name}Brush" Color="{StaticResource ${c.name}}"/>`
    )
    .join("\n");

  const fontResources = fonts
    .map((f) =>
      (f.sizes ?? [])
        .map((size) => `  <sys:Double x:Key="FontSize${size}">${size}</sys:Double>`)
        .join("\n")
    )
    .join("\n");

  const spacingResources = spacing
    .map((s) => `  <sys:Double x:Key="Spacing${s}">${s}</sys:Double>`)
    .join("\n");

  const thicknessResources = spacing
    .filter((s) => [4, 8, 16, 24].includes(s))
    .map(
      (s) =>
        `  <Thickness x:Key="Margin${s}">${s}</Thickness>\n  <Thickness x:Key="Padding${s}">${s}</Thickness>`
    )
    .join("\n");

  return `${RESOURCE_DICT_HEADER}

  <!-- Colors (피그마 원본값) -->
${colorResources}

  <!-- Font Sizes -->
${fontResources}

  <!-- Spacing -->
${spacingResources}

  <!-- Thickness -->
${thicknessResources}

</ResourceDictionary>`;
}

export function generateSpecMarkdown(analysis: AnalysisResult, frameName: string): string {
  const layout = analysis.layout ?? { type: "Grid", rows: [], columns: [], regions: [] };
  const components = analysis.components ?? [];
  const tokens = analysis.design_tokens ?? { colors: [], fonts: [], spacing: [] };

  const rows = layout.rows ?? [];
  const columns = layout.columns ?? [];
  const regions = layout.regions ?? [];
  const colors = tokens.colors ?? [];
  const fonts = tokens.fonts ?? [];
  const spacing = tokens.spacing ?? [];

  const componentTable = components
    .map(
      (c) =>
        `| ${c.layer_name} | ${c.wpf_control} | ${c.purpose} | ${c.width}×${c.height} | ${c.margin ?? "0"} | ${(c.states ?? []).join(", ")} |`
    )
    .join("\n");

  const colorTable = colors
    .map((c) => `| ${c.name} | \`${c.hex}\` | ${c.usage} |`)
    .join("\n");

  const fontList = fonts
    .map(
      (f) =>
        `- **${f.family}**: sizes [${(f.sizes ?? []).join(", ")}]px, weights [${(f.weights ?? []).join(", ")}]`
    )
    .join("\n");

  return `# ${frameName} — WPF 개발 스펙

## 화면 개요
${analysis.screen_summary ?? ""}

---

## 레이아웃
- 컨테이너: **${layout.type ?? "Grid"}**
- Rows: \`${rows.join(", ")}\`
- Columns: \`${columns.join(", ")}\`

### 영역 구성
| 영역 | Row | Col | Height |
|---|---|---|---|
${regions.map((r) => `| ${r.name} | ${r.row} | ${r.col} | ${r.height ?? "Auto"} |`).join("\n")}

---

## 컴포넌트 목록
| 레이어명 | WPF 컨트롤 | 용도 | 크기 | Margin | 상태 |
|---|---|---|---|---|---|
${componentTable}

---

## 디자인 토큰

### 컬러
| 이름 | HEX | 사용처 |
|---|---|---|
${colorTable}

### 폰트
${fontList}

### 간격
\`${spacing.join(", ")}\` px

---

## 개발 주의사항
${analysis.xaml_notes ?? ""}
`;
}
