import type { FigmaFrameData, FigmaNode, FigmaColor, FigmaFont, FigmaFill } from "./types";

const MAX_DEPTH = 4;
const MAX_NODES = 60;

export function rgbaToHex(color: { r: number; g: number; b: number }): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
}

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
  return "Border";
}

export function constraintToAlignment(constraint: string): string {
  const map: Record<string, string> = {
    LEFT: "Left", RIGHT: "Right", CENTER: "Center",
    SCALE: "Stretch", STRETCH: "Stretch",
    TOP: "Top", BOTTOM: "Bottom",
  };
  return map[constraint] ?? "Left";
}

export function normalizeSpacing(value: number): number {
  return Math.round(value / 4) * 4;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNodes(raw: any, depth = 0, counter = { count: 0 }): FigmaNode[] {
  if (!raw || depth > MAX_DEPTH || counter.count >= MAX_NODES) return [];
  counter.count++;

  const node: FigmaNode = {
    id: raw.id ?? "",
    name: raw.name ?? "",
    type: raw.type ?? "",
    x: raw.absoluteBoundingBox?.x ?? raw.x ?? 0,
    y: raw.absoluteBoundingBox?.y ?? raw.y ?? 0,
    width: raw.absoluteBoundingBox?.width ?? raw.size?.x ?? 0,
    height: raw.absoluteBoundingBox?.height ?? raw.size?.y ?? 0,
  };

  if (raw.fills?.length) {
    node.fills = raw.fills.map((f: FigmaFill) => ({ type: f.type, color: f.color }));
  }
  if (raw.strokes?.length) {
    node.strokes = raw.strokes.map((s: FigmaFill) => ({ type: s.type, color: s.color }));
  }
  if (raw.cornerRadius != null) node.cornerRadius = raw.cornerRadius;
  if (raw.fontSize != null) node.fontSize = raw.fontSize;
  if (raw.fontName != null) node.fontName = raw.fontName;
  if (raw.characters != null) node.characters = raw.characters;
  if (raw.constraints != null) node.constraints = raw.constraints;

  if (raw.children?.length && depth < MAX_DEPTH) {
    const children: FigmaNode[] = [];
    for (const child of raw.children) {
      if (counter.count >= MAX_NODES) break;
      children.push(...extractNodes(child, depth + 1, counter));
    }
    if (children.length) node.children = children;
  }

  return [node];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectColors(nodes: FigmaNode[], result: Map<string, FigmaColor>): void {
  for (const node of nodes) {
    for (const fill of node.fills ?? []) {
      if (fill.type === "SOLID" && fill.color) {
        const hex = rgbaToHex(fill.color);
        if (!result.has(hex)) {
          result.set(hex, { name: `Color_${hex.replace("#", "")}`, hex, usage: node.name });
        }
      }
    }
    if (node.children) collectColors(node.children, result);
  }
}

function collectFonts(nodes: FigmaNode[], result: Map<string, FigmaFont>): void {
  for (const node of nodes) {
    if (node.type === "TEXT" && node.fontName && node.fontSize) {
      const key = `${node.fontName.family}_${node.fontName.style}`;
      const existing = result.get(key);
      if (existing) {
        existing.usageCount++;
      } else {
        result.set(key, { family: node.fontName.family, style: node.fontName.style, size: node.fontSize, usageCount: 1 });
      }
    }
    if (node.children) collectFonts(node.children, result);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFigmaResponse(raw: any): FigmaFrameData {
  const nodeKeys = Object.keys(raw.nodes ?? {});
  if (!nodeKeys.length) throw new Error("노드 데이터가 없습니다");

  const nodeEntry = raw.nodes[nodeKeys[0]];
  if (!nodeEntry) throw new Error("노드 데이터가 없습니다");
  const rootDocument = nodeEntry.document ?? nodeEntry;
  const counter = { count: 0 };
  const nodes = extractNodes(rootDocument, 0, counter);

  const colorMap = new Map<string, FigmaColor>();
  const fontMap = new Map<string, FigmaFont>();

  collectColors(nodes, colorMap);
  collectFonts(nodes, fontMap);

  return {
    frameName: rootDocument.name ?? "Frame",
    width: rootDocument.absoluteBoundingBox?.width ?? rootDocument.size?.x ?? 0,
    height: rootDocument.absoluteBoundingBox?.height ?? rootDocument.size?.y ?? 0,
    nodes,
    colors: Array.from(colorMap.values()).slice(0, 20),
    fonts: Array.from(fontMap.values()),
    spacings: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  };
}

export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
  const fileKeyMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  const nodeIdMatch = url.match(/node-id=([^&]+)/);

  if (!fileKeyMatch) throw new Error("피그마 파일 키를 찾을 수 없습니다");
  if (!nodeIdMatch) throw new Error("node-id가 없습니다. 프레임을 선택 후 링크를 복사해주세요");

  return {
    fileKey: fileKeyMatch[1],
    nodeId: decodeURIComponent(nodeIdMatch[1]),
  };
}
