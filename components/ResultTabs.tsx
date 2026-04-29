"use client";

import { useState } from "react";
import CodeBlock from "./CodeBlock";
import type { AnalyzeResponse } from "@/lib/types";

interface ResultTabsProps {
  result: AnalyzeResponse;
}

type TabId = "spec" | "xaml" | "resource";

const TABS: { id: TabId; label: string }[] = [
  { id: "spec", label: "스펙 문서" },
  { id: "xaml", label: "XAML 뼈대" },
  { id: "resource", label: "ResourceDictionary" },
];

export default function ResultTabs({ result }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("spec");

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const frameName = result.frameName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_");

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "spec" && (
        <CodeBlock
          code={result.specMarkdown}
          language="markdown"
          filename={`${frameName}_spec.md`}
          onDownload={() => downloadFile(result.specMarkdown, `${frameName}_spec.md`)}
        />
      )}
      {activeTab === "xaml" && (
        <CodeBlock
          code={result.xaml}
          language="xml"
          filename={`${frameName}.xaml`}
          onDownload={() => downloadFile(result.xaml, `${frameName}.xaml`)}
        />
      )}
      {activeTab === "resource" && (
        <CodeBlock
          code={result.resourceDict}
          language="xml"
          filename="ResourceDictionary.xaml"
          onDownload={() => downloadFile(result.resourceDict, "ResourceDictionary.xaml")}
        />
      )}
    </div>
  );
}
