import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Component for code blocks in markdown
const CodeBlock = ({ language, children }) => {
  return (
    <SyntaxHighlighter
      language={language || "text"}
      style={atomDark}
      className="rounded-md"
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
};

export default function Message({ message, isLoading = false }) {
  const { role, content, reasoning } = message;
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  // Function to copy message content to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`py-5 ${isUser ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}`}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-start">
          {/* Avatar */}
          <div className={`flex-shrink-0 mr-3 ${isLoading ? "animate-pulse" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isUser
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
              }`}
            >
              {isUser ? "U" : "AI"}
            </div>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
              {isUser ? "You" : "AI Assistant"}
            </div>
            
            {/* Markdown content */}
            <div className={`mt-1 prose dark:prose-invert max-w-none ${isLoading ? "opacity-50" : ""}`}>
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline ? (
                      <CodeBlock language={match ? match[1] : ""} {...props}>
                        {children}
                      </CodeBlock>
                    ) : (
                      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
            
            {/* Reasoning/thinking (if available) */}
            {reasoning && (
              <div className="mt-2">
                <details className="text-sm">
                  <summary className="text-gray-600 dark:text-gray-400 cursor-pointer">
                    Show thinking process
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-gray-300 dark:border-gray-600 prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{reasoning}</ReactMarkdown>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Copy button */}
          {!isLoading && (
            <div className="ml-2 flex-shrink-0">
              <button
                onClick={copyToClipboard}
                style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Copy to clipboard"
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 