"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResultTabs from "@/components/ResultTabs";
import type { AnalyzeResponse } from "@/lib/types";
import JSZip from "jszip";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("analyzeResult");
    if (!stored) {
      router.push("/");
      return;
    }
    setResult(JSON.parse(stored));
  }, [router]);

  async function handleZipDownload() {
    if (!result) return;

    const zip = new JSZip();
    const frameName = result.frameName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");

    zip.file(`${frameName}_spec.md`, result.specMarkdown);
    zip.file(`${frameName}.xaml`, result.xaml);
    zip.file("ResourceDictionary.xaml", result.resourceDict);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${frameName}_wpf.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!result) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← 새 화면 분석
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{result.frameName} 분석 결과</h1>
          <p className="mt-1 text-sm text-gray-500">{result.analysis.screen_summary}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <ResultTabs result={result} />
        </div>

        <button
          onClick={handleZipDownload}
          className="w-full py-3 px-6 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          전체 ZIP 다운로드 (.md + .xaml + ResourceDictionary.xaml)
        </button>
      </div>
    </main>
  );
}
