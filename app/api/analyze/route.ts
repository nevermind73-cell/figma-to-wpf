import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseFigmaUrl, parseFigmaResponse } from "@/lib/figma-parser";
import { buildAnalysisPrompt } from "@/lib/prompts";
import { generateXaml, generateResourceDictionary, generateSpecMarkdown } from "@/lib/xaml-generator";
import type { ScreenType, OutputType, AnalysisResult, AnalyzeResponse } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function fetchFigmaNode(fileKey: string, nodeId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(
      `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}`,
      { headers: { "X-Figma-Token": process.env.FIGMA_API_TOKEN! }, signal: controller.signal }
    );
    if (res.status === 403) throw new Error("파일 접근 권한이 없습니다. 피그마 토큰을 확인해주세요");
    if (res.status === 404) throw new Error("피그마 파일을 찾을 수 없습니다");
    if (!res.ok) throw new Error(`Figma API 오류: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithGemini(figmaData: Parameters<typeof buildAnalysisPrompt>[0], screenType: ScreenType): Promise<AnalysisResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = buildAnalysisPrompt(figmaData, screenType);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // 마크다운 코드블록 제거 후 JSON 객체 부분만 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("응답 파싱에 실패했습니다. 다시 시도해주세요");
  try {
    return JSON.parse(jsonMatch[0]) as AnalysisResult;
  } catch {
    throw new Error("응답 파싱에 실패했습니다. 다시 시도해주세요");
  }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseMessage(event, data)));
      };

      try {
        const body = await req.json() as {
          figmaUrl: string;
          screenType: ScreenType;
          outputTypes: OutputType[];
        };

        const { figmaUrl, screenType } = body;

        if (!figmaUrl?.includes("node-id")) {
          send("error", { error: "프레임을 선택 후 링크를 복사해주세요" });
          controller.close();
          return;
        }

        // 1단계: Figma 데이터 수신
        send("stage", { stage: "figma", message: "피그마 데이터 불러오는 중..." });

        const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
        const rawData = await fetchFigmaNode(fileKey, nodeId);
        const figmaData = parseFigmaResponse(rawData);

        // 2단계: Gemini 분석
        send("stage", { stage: "gemini", message: "AI가 WPF 구조 분석 중..." });

        const analysis = await analyzeWithGemini(figmaData, screenType);

        // 3단계: 결과 생성
        send("stage", { stage: "generating", message: "XAML 및 스펙 문서 생성 중..." });

        const result: AnalyzeResponse = {
          frameName: figmaData.frameName,
          analysis,
          xaml: generateXaml(analysis, figmaData.frameName),
          resourceDict: generateResourceDictionary(analysis),
          specMarkdown: generateSpecMarkdown(analysis, figmaData.frameName),
        };

        send("done", result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "분석 중 오류가 발생했습니다. 다시 시도해주세요";
        const errorMessage = message.includes("429")
          ? "Gemini API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요"
          : message;
        send("error", { error: errorMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
