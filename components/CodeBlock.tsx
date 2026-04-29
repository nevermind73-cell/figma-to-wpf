"use client";

import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  onDownload?: () => void;
}

export default function CodeBlock({ code, language = "xml", filename, onDownload }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-500 font-mono">{filename ?? language}</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            {copied ? "복사됨!" : "복사"}
          </button>
          {onDownload && (
            <button
              onClick={onDownload}
              className="text-xs px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              다운로드
            </button>
          )}
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-sm bg-gray-900 text-gray-100 max-h-[600px] overflow-y-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
