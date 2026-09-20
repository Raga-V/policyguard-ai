import React from 'react';

interface PolicyPreviewProps {
  policyText: string;
}

export default function PolicyPreview({ policyText }: PolicyPreviewProps) {
  // Simple regex-based syntax highlighter for Cedar
  const highlight = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, i) => {
      // Very basic highlighting logic for presentation purposes
      let highlightedLine = line
        // Comments
        .replace(/(\/\/.*)/g, '<span class="text-gray-500 italic">$1</span>')
        // Strings
        .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="text-amber-300">$&</span>')
        // Keywords
        .replace(/\b(permit)\b/g, '<span class="text-emerald-400 font-bold">$1</span>')
        .replace(/\b(forbid)\b/g, '<span class="text-red-400 font-bold">$1</span>')
        .replace(/\b(when|unless|if|then|else)\b/g, '<span class="text-blue-400">$1</span>')
        // Variables
        .replace(/\b(principal|action|resource|context)\b/g, '<span class="text-purple-400">$1</span>');

      return (
        <div key={i} className="table-row">
          <span className="table-cell text-right pr-4 text-gray-600 select-none text-xs align-middle">{i + 1}</span>
          <span className="table-cell whitespace-pre" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      );
    });
  };

  return (
    <div className="bg-[#0d1117] text-gray-300 p-4 font-mono text-sm overflow-x-auto min-h-[150px]">
      <div className="table border-spacing-0">
        {highlight(policyText)}
      </div>
    </div>
  );
}
