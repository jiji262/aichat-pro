import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";
import Message from "../components/Message";

export default function ChatPage() {
  const { t } = useI18n();
  const { sessionId } = useParams();
  const [chatSession, setChatSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState(null);

  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Load providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const allProviders = await invoke("get_providers");
        setProviders(allProviders);
        
        // Set first provider as default if available
        if (allProviders.length > 0 && !selectedProviderId) {
          setSelectedProviderId(allProviders[0].id);
        }
      } catch (error) {
        console.error("Failed to load providers:", error);
      }
    };
    
    loadProviders();
  }, []);
  
  // Load models when provider is selected
  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProviderId) return;
      
      try {
        const providerModels = await invoke("get_models", {
          providerId: selectedProviderId
        });
        
        setModels(providerModels);
        
        // Set first model as default if available
        if (providerModels.length > 0 && !selectedModelId) {
          setSelectedModelId(providerModels[0].id);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };
    
    loadModels();
  }, [selectedProviderId]);
  
  // Load chat session and messages
  useEffect(() => {
    const loadChat = async () => {
      if (!sessionId) return;
      
      try {
        setIsLoading(true);
        
        // Load chat session
        const session = await invoke("get_chat_session", { id: sessionId });
        setChatSession(session);
        
        // If session has a model_id, set it as selected
        if (session && session.model_id) {
          setSelectedModelId(session.model_id);
        }
        
        // Load chat messages
        const chatMessages = await invoke("get_chat_messages", { 
          sessionId: sessionId 
        });
        setMessages(chatMessages);
      } catch (error) {
        console.error("Failed to load chat:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChat();
  }, [sessionId]);
  
  // Scroll to bottom when messages change or when streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage]);
  
  // Auto resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [userInput]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userInput.trim() || !sessionId) return;
    
    // Check if provider and model are selected
    if (!selectedProviderId || !selectedModelId) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          id: `error-${Date.now()}`, 
          role: "assistant", 
          content: t('errors.providerNotFound'),
          timestamp: Date.now()
        }
      ]);
      return;
    }
    
    // Create user message
    const userMessage = {
      role: "user",
      content: userInput,
    };
    
    try {
      // Add user message to UI
      const userMessageId = await invoke("add_chat_message", {
        message: {
          session_id: sessionId,
          role: "user",
          content: userInput,
        },
      });
      
      // Clear input
      setUserInput("");
      
      // Add message to state
      setMessages((prevMessages) => [
        ...prevMessages,
        { ...userMessage, id: userMessageId, timestamp: Date.now() }
      ]);
      
      // Show AI thinking indicator
      setStreamingMessage({
        role: "assistant",
        content: t('chat.thinking'),
      });
      
      // Send message to AI
      const response = await invoke("send_chat_request", {
        request: {
          provider_id: selectedProviderId,
          model_id: selectedModelId,
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), userMessage]
        }
      });
      
      // Remove streaming indicator
      setStreamingMessage(null);
      
      // Add AI response to UI
      const aiMessageId = await invoke("add_chat_message", {
        message: {
          session_id: sessionId,
          role: "assistant",
          content: response.content,
        },
      });
      
      // Add message to state
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          id: aiMessageId, 
          role: "assistant", 
          content: response.content,
          reasoning: response.reasoning,
          timestamp: Date.now()
        }
      ]);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Remove streaming indicator
      setStreamingMessage(null);
      
      // Add error message
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          id: `error-${Date.now()}`, 
          role: "assistant", 
          content: `Error: ${error.toString()}`,
          timestamp: Date.now()
        }
      ]);
    }
  };
  
  // Update session with selected model
  const updateSessionModel = async () => {
    if (!sessionId || !chatSession) return;
    
    try {
      await invoke("update_chat_session", {
        session: {
          id: sessionId,
          name: chatSession.name,
          model_id: selectedModelId,
          system_prompt: chatSession.system_prompt
        }
      });
    } catch (error) {
      console.error("Failed to update session model:", error);
    }
  };
  
  // Update session model when it changes
  useEffect(() => {
    if (selectedModelId && sessionId) {
      updateSessionModel();
    }
  }, [selectedModelId]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {chatSession ? chatSession.name : "Select a chat"}
          </h1>
          
          {/* Model selector */}
          <div className="flex space-x-2">
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
            >
              {providers.length > 0 ? (
                providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))
              ) : (
                <option value="">{t('chat.noProviders')}</option>
              )}
            </select>

            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
            >
              {models.length > 0 ? (
                models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              ) : (
                <option value="">{t('chat.noModels')}</option>
              )}
            </select>
          </div>
        </div>
      </header>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {sessionId ? (
          <>
            {/* Loading state */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* System message if set */}
                {chatSession && chatSession.system_prompt && (
                  <Message 
                    message={{ 
                      role: "system", 
                      content: chatSession.system_prompt 
                    }} 
                  />
                )}
                
                {/* Chat messages */}
                {messages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}
                
                {/* Streaming message (AI thinking) */}
                {streamingMessage && (
                  <Message message={streamingMessage} isLoading={true} />
                )}
                
                {/* Empty state */}
                {messages.length === 0 && !streamingMessage && (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    <p className="text-lg">No messages yet</p>
                    <p className="text-sm">Start the conversation by sending a message below</p>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-lg">No chat selected</p>
            <p className="text-sm">Select a chat from the sidebar or create a new one</p>
          </div>
        )}
      </div>
      
      {/* Input area */}
      {sessionId && (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex">
              <div className="flex-1 mr-2">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t('chat.typeMessage')}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  rows="1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-icon"
                disabled={!userInput.trim() || streamingMessage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              Press Shift+Enter for a new line, Enter to send
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 