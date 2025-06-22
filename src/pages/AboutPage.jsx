import { useState, useEffect } from "react";

export default function AboutPage() {
  const [appVersion, setAppVersion] = useState("1.0.0");
  
  const openLink = (url) => {
    window.open(url, '_blank');
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">About</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">AI Chat</h2>
            <p className="text-gray-600 dark:text-gray-400">Version {appVersion}</p>
          </div>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          AI Chat is a cross-platform desktop client that provides a unified interface for multiple AI service providers. 
          It allows you to interact with various AI models from different providers in a single, consistent user interface.
        </p>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Features</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Multiple AI provider support (OpenAI, Gemini, DeepSeek, Grok)</li>
            <li>Local-first data storage for privacy</li>
            <li>Custom assistants with specialized system prompts</li>
            <li>Full markdown rendering with syntax highlighting</li>
            <li>Light and dark themes</li>
            <li>Cross-platform (Windows and macOS)</li>
          </ul>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Built With</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); openLink("https://tauri.app") }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Tauri
              </a> - A framework for building lightweight desktop applications
            </li>
            <li>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); openLink("https://react.dev") }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                React
              </a> - A JavaScript library for building user interfaces
            </li>
            <li>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); openLink("https://www.rust-lang.org") }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Rust
              </a> - A language empowering everyone to build reliable and efficient software
            </li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">License</h3>
          <p className="text-gray-700 dark:text-gray-300">
            AI Chat is open source software licensed under the MIT license.
          </p>
        </div>
      </div>
    </div>
  );
} 