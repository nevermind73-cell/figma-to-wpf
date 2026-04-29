"use client";

import { useState } from "react";
import type { ScreenType, OutputType } from "@/lib/types";

interface UrlInputProps {
  onSubmit: (data: {
    figmaUrl: string;
    screenType: ScreenType;
    outputTypes: OutputType[];
  }) => void;
  isLoading: boolean;
}

const SCREEN_TYPE_LABELS: Record<ScreenType, string> = {
  form: "폼 (Form)",
  dialog: "다이얼로그 (Dialog)",
  dashboard: "대시보드 (Dashboard)",
  list: "목록 (List)",
  other: "기타 (Other)",
};

const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  spec: "스펙 문서",
  xaml: "XAML 뼈대",
  resource: "ResourceDictionary",
};

export default function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [screenType, setScreenType] = useState<ScreenType>("form");
  const [outputTypes, setOutputTypes] = useState<OutputType[]>(["spec", "xaml", "resource"]);
  const [error, setError] = useState("");

  function validateUrl(url: string): string {
    if (!url.trim()) return "피그마 URL을 입력해주세요";
    if (!url.includes("figma.com")) return "figma.com URL을 입력해주세요";
    if (!url.includes("node-id")) return "프레임을 선택 후 링크를 복사해주세요 (node-id 필요)";
    return "";
  }

  function toggleOutputType(type: OutputType) {
    setOutputTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateUrl(figmaUrl);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (outputTypes.length === 0) {
      setError("출력 형식을 하나 이상 선택해주세요");
      return;
    }
    setError("");
    onSubmit({ figmaUrl, screenType, outputTypes });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          피그마 프레임 URL
        </label>
        <input
          type="url"
          value={figmaUrl}
          onChange={(e) => { setFigmaUrl(e.target.value); setError(""); }}
          placeholder="https://www.figma.com/file/..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-500">
          ℹ 프레임 선택 후 우클릭 → Copy link 로 복사한 URL을 붙여넣으세요
        </p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          화면 유형
        </label>
        <select
          value={screenType}
          onChange={(e) => setScreenType(e.target.value as ScreenType)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          disabled={isLoading}
        >
          {(Object.keys(SCREEN_TYPE_LABELS) as ScreenType[]).map((type) => (
            <option key={type} value={type}>
              {SCREEN_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          출력 형식
        </label>
        <div className="flex gap-4">
          {(Object.keys(OUTPUT_TYPE_LABELS) as OutputType[]).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={outputTypes.includes(type)}
                onChange={() => toggleOutputType(type)}
                className="w-4 h-4 text-blue-600 rounded"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">{OUTPUT_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "분석 중..." : "분석 시작"}
      </button>
    </form>
  );
}
