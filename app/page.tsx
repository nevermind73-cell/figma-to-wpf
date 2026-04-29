"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UrlInput from "@/components/UrlInput";
import type { ScreenType, OutputType, AnalyzeResponse } from "@/lib/types";

const STAGE_MESSAGES: Record<string, string> = {
  figma: "피그마 데이터 불러오는 중...",
  gemini: "AI가 WPF 구조 분석 중...",
  generating: "XAML 및 스펙 문서 생성 중...",
};

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stageMessage, setStageMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAnalyze(data: {
    figmaUrl: string;
    screenType: ScreenType;
    outputTypes: OutputType[];
  }) {
    setIsLoading(true);
    setErrorMessage("");
    setStageMessage("요청 준비 중...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.body) throw new Error("스트림을 받을 수 없습니다");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let event = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.slice(7).trim();
          } else if (line.startsWith("data: ") && event) {
            const payload = JSON.parse(line.slice(6));

            if (event === "stage") {
              setStageMessage(STAGE_MESSAGES[payload.stage] ?? payload.message);
            } else if (event === "error") {
              setErrorMessage(payload.error);
              setIsLoading(false);
              return;
            } else if (event === "done") {
              const result: AnalyzeResponse = payload;
              sessionStorage.setItem("analyzeResult", JSON.stringify(result));
              router.push("/result");
              return;
            }
            event = "";
          }
        }
      }
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해주세요");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">figma → WPF</h1>
          <p className="mt-1 text-sm text-gray-500">
            피그마 프레임을 WPF 개발 스펙으로 변환합니다
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
              <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {stageMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
        </div>
      </div>
    </main>
  );
}
