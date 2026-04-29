export type ScreenType = "form" | "dialog" | "dashboard" | "list" | "other";
export type OutputType = "spec" | "xaml" | "resource";

export interface AnalyzeRequest {
  figmaUrl: string;
  fileKey: string;
  nodeId: string;
  screenType: ScreenType;
  outputTypes: OutputType[];
}

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
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: FigmaFill[];
  strokes?: FigmaFill[];
  cornerRadius?: number;
  fontSize?: number;
  fontName?: { family: string; style: string };
  characters?: string;
  children?: FigmaNode[];
  constraints?: {
    horizontal: string;
    vertical: string;
  };
}

export interface FigmaColor {
  name: string;
  hex: string;
  usage: string;
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
    layer_name: string;
    width: string;
    height: string;
    margin: string;
    horizontal_alignment?: string;
    states: string[];
  }[];
  design_tokens: {
    colors: {
      name: string;
      hex: string;
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

export interface AnalyzeResponse {
  frameName: string;
  analysis: AnalysisResult;
  xaml: string;
  resourceDict: string;
  specMarkdown: string;
}
