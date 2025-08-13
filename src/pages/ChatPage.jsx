import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";
import Message from "../components/Message";
// Import RetroUI components
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Select } from "@/components/retroui/Select";

// 简单的防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export default function ChatPage() {
  const { t } = useI18n();
  const { sessionId } = useParams();
  const [chatSession, setChatSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [inputHeight, setInputHeight] = useState("auto"); // Track textarea height separately
  const [minInputHeight, setMinInputHeight] = useState(40); // 设置最小输入框高度
  const [savedUserInput, setSavedUserInput] = useState(""); // 保存用户输入，以便在取消时恢复
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTypingResponse, setIsTypingResponse] = useState(false); // 添加打字效果状态
  const stopGenerationRef = useRef(false);

  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Load providers function
  const loadProviders = useCallback(async () => {
    try {
      const allProviders = await invoke("get_providers");
      
      // Apply same filtering logic as ProvidersPage
      // 过滤掉没有设置API密钥的默认提供商
      const filteredProviders = allProviders.filter(provider => {
        // 如果是默认提供商(ID长度较短，如"openai", "gemini"等)
        if (provider.id && !provider.id.includes('-')) {
          // 只有设置了API密钥的默认提供商才显示
          return provider.api_key !== null && provider.api_key !== undefined && provider.api_key !== '';
        }
        // 自定义提供商总是显示
        return true;
      });
      
      setProviders(filteredProviders);
      
      // Set first provider as default if available
      if (filteredProviders.length > 0 && !selectedProviderId) {
        setSelectedProviderId(filteredProviders[0].id);
      }
      
      // Check if currently selected provider still exists
      if (selectedProviderId && !filteredProviders.find(p => p.id === selectedProviderId)) {
        // If selected provider was deleted, reset to first available or empty
        if (filteredProviders.length > 0) {
          setSelectedProviderId(filteredProviders[0].id);
        } else {
          setSelectedProviderId("");
          setModels([]);
          setSelectedModelId("");
        }
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  }, [selectedProviderId]);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Reload providers when page becomes visible (to catch changes from other pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProviders();
      }
    };

    const handleFocus = () => {
      loadProviders();
    };

    // Listen for both visibility change and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadProviders]);
  
  // Load models when provider is selected
  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProviderId) return;
      
      try {
        const allModels = await invoke("get_models", {
          providerId: selectedProviderId
        });
        
        // Only show favorite models, no fallback to all models
        const favoriteModels = allModels.filter(model => model.is_favorite);
        
        setModels(favoriteModels);
        
        // Set first model as default if available, or maintain current selection if still valid
        if (favoriteModels.length > 0) {
          const currentModelStillValid = favoriteModels.some(model => model.id === selectedModelId);
          if (!selectedModelId || !currentModelStillValid) {
            setSelectedModelId(favoriteModels[0].id);
          }
        } else {
          setSelectedModelId("");
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
          
          // 获取此模型所属的提供商ID
          try {
            // 获取所有提供商
            const allProviders = await invoke("get_providers");
            
            // 遍历每个提供商，找到包含所选模型的提供商
            for (const provider of allProviders) {
              const providerModels = await invoke("get_models", { 
                providerId: provider.id 
              });
              
              // 检查此提供商是否拥有当前选择的模型
              const hasModel = providerModels.some(model => model.id === session.model_id);
              
              if (hasModel) {
                // 更新当前选择的提供商
                setSelectedProviderId(provider.id);
                // 只设置收藏的模型列表
                const favoriteModels = providerModels.filter(model => model.is_favorite);
                setModels(favoriteModels);
                break;
              }
            }
          } catch (error) {
            console.error("Failed to find provider for model:", error);
          }
        }
        
        // Load chat messages
        const chatMessages = await invoke("get_chat_messages", { 
          sessionId: sessionId 
        });
        setMessages(chatMessages);
        
        // 消息加载完成后，设置一个短延迟滚动到底部
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
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
  
  // Auto resize textarea as content grows - optimized
  useEffect(() => {
    if (textareaRef.current) {
      // Debounce height adjustments to reduce jitter
      const adjustHeight = () => {
        const textarea = textareaRef.current;
        // 保存当前高度作为最小高度，以防止提交后高度突然变小
        if (userInput.length > 0) {
          const currentHeight = Math.max(40, textarea.scrollHeight);
          setMinInputHeight(currentHeight);
        }
        
        // Start with minimal height to measure properly
        textarea.style.height = "0";
        // Set to scrollHeight to fit content exactly,但不小于最小高度
        const newHeight = Math.min(200, Math.max(minInputHeight, textarea.scrollHeight));
        setInputHeight(`${newHeight}px`);
      };

      // Slight delay before adjustment to batch change operations
      const timeoutId = setTimeout(adjustHeight, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [userInput, minInputHeight]);
  
  // 停止生成的处理函数
  const handleStopGeneration = () => {
    console.log("停止生成被触发");
    // 设置停止标志，这会被TypeWriter组件检测到
    stopGenerationRef.current = true;
    
    // 如果正在显示thinking状态，直接移除
    if (streamingMessage) {
      setStreamingMessage(null);
    }
    
    // 重置打字效果状态 - 立即重置状态以更新UI
    setIsTypingResponse(false);
    
    // 查找当前正在打字的消息，并标记为非新消息，这样就不会再显示打字效果
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.isNew ? { ...msg, isNew: false } : msg
      )
    );
    
    // 恢复用户输入
    if (savedUserInput) {
      setUserInput(savedUserInput);
      
      // 调整输入框高度以适应恢复的文本
      if (textareaRef.current) {
        setTimeout(() => {
          const textarea = textareaRef.current;
          textarea.style.height = "0";
          const scrollHeight = textarea.scrollHeight;
          setInputHeight(`${Math.min(200, Math.max(40, scrollHeight))}px`);
        }, 0);
      }
    }
    
    setSavedUserInput("");
    
    // 重置生成状态
    setIsGenerating(false);
    
    // 在下一个事件循环中再次检查，确保停止状态被正确处理
    setTimeout(() => {
      if (stopGenerationRef.current) {
        console.log("确认停止生成");
        // 强制重新渲染
        setIsGenerating(false);
        setIsTypingResponse(false);
      }
    }, 50);
  };

  // 清除输入框内容但保留高度
  const clearInputButKeepHeight = () => {
    // 先保存当前高度
    const currentHeight = textareaRef.current ? textareaRef.current.scrollHeight : 40;
    setMinInputHeight(Math.max(40, currentHeight));
    // 然后清空内容
    setUserInput("");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("提交或停止按钮被点击", { isGenerating, streamingMessage, isTypingResponse });
    
    // 如果正在生成或显示thinking状态或打字效果，则点击按钮时停止生成
    if (isGenerating || streamingMessage || isTypingResponse) {
      console.log("触发停止生成");
      handleStopGeneration();
      return;
    }
    
    if (!userInput.trim() || !sessionId) return;
    
    // Check if provider and model are selected
    if (!selectedProviderId || !selectedModelId) {
      const errorMessage = !selectedProviderId 
        ? "No provider selected. Please select a provider first."
        : "No favorite models available. Please go to the Providers page and mark some models as favorites by clicking the '+' button.";
      
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          id: `error-${Date.now()}`, 
          role: "assistant", 
          content: errorMessage,
          timestamp: Date.now()
        }
      ]);
      return;
    }
    
    // 重置停止生成标志
    stopGenerationRef.current = false;
    setIsGenerating(true);
    
    // 保存用户输入，以便在取消时恢复
    setSavedUserInput(userInput);
    
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
      
      // 清除输入但保持高度
      clearInputButKeepHeight();
      
      // Add message to state
      setMessages((prevMessages) => [
        ...prevMessages,
        { ...userMessage, id: userMessageId, timestamp: Date.now() }
      ]);
      
      // 检查是否已停止生成
      if (stopGenerationRef.current) {
        setIsGenerating(false);
        return;
      }
      
      // Show AI thinking indicator
      setStreamingMessage({
        role: "assistant",
        content: t('chat.thinking'),
      });
      
      // 检查是否已停止生成
      if (stopGenerationRef.current) {
        setStreamingMessage(null);
        setIsGenerating(false);
        return;
      }
      
      // Send message to AI
      const response = await invoke("send_chat_request", {
        request: {
          provider_id: selectedProviderId,
          model_id: selectedModelId,
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), userMessage]
        }
      });
      
      // 检查是否已停止生成
      if (stopGenerationRef.current) {
        setStreamingMessage(null);
        setIsGenerating(false);
        return;
      }
      
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
      
      // Add message to state with isNew标记
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          id: aiMessageId, 
          role: "assistant", 
          content: response.content,
          reasoning: response.reasoning,
          timestamp: Date.now(),
          isNew: true // 添加新回复标记
        }
      ]);
      
      // 清除保存的输入，因为请求已成功
      setSavedUserInput("");
      
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
      
      // 恢复用户输入到输入框
      setUserInput(savedUserInput);
      setSavedUserInput("");
      
    } finally {
      // 无论成功或失败，都重置生成状态
      setIsGenerating(false);
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
  
  // 处理打字状态变化的回调
  const handleTypingStatusChange = (isTyping) => {
    setIsTypingResponse(isTyping);
  };

  // 使用useCallback和防抖来优化输入处理
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setUserInput(value);
  }, []);

  // 记忆消息列表组件以减少不必要的重渲染
  const messageListMemo = useMemo(() => {
    return (
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
          <Message 
            key={message.id} 
            message={message} 
            isNew={message.isNew || false} 
            stopRef={stopGenerationRef}
            onTypingStatusChange={handleTypingStatusChange}
          />
        ))}
        
        {/* Streaming message (AI thinking) */}
        {streamingMessage && (
          <Message message={streamingMessage} isLoading={true} />
        )}
      </>
    );
  }, [messages, chatSession, streamingMessage, stopGenerationRef, handleTypingStatusChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <Card className="border-b-2 border-l-0 border-r-0 border-t-0 shadow-none p-4">
        <div className="flex justify-between items-center">
          <Text as="h1" className="text-xl font-head font-semibold">
            {chatSession ? chatSession.name : "Select a chat"}
          </Text>
          
          {/* Model selector */}
          <div className="flex space-x-3">
            <div className="w-48">
              <Select.Root value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <Select.Trigger className="w-full shadow-retro-md hover:shadow-retro-sm hover:translate-y-0.5 transition-all duration-200">
                  <Select.Value placeholder={providers.length > 0 ? "Select provider" : t('chat.noProviders')} />
                </Select.Trigger>
                <Select.Content className="shadow-retro-lg border-2 border-border">
                  {providers.length > 0 ? (
                    providers.map((provider) => (
                      <Select.Item 
                        key={provider.id} 
                        value={provider.id}
                        className="hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      >
                        {provider.name}
                      </Select.Item>
                    ))
                  ) : (
                    <Select.Item value="no-providers" disabled className="text-muted-foreground">
                      {t('chat.noProviders')}
                    </Select.Item>
                  )}
                </Select.Content>
              </Select.Root>
            </div>

            <div className="w-64">
              <Select.Root 
                value={selectedModelId} 
                onValueChange={setSelectedModelId} 
                disabled={models.length === 0}
              >
                <Select.Trigger className="w-full shadow-retro-md hover:shadow-retro-sm hover:translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Select.Value placeholder={models.length > 0 ? "Select model" : "No favorite models - Go to Providers page to add favorites"} />
                </Select.Trigger>
                <Select.Content className="shadow-retro-lg border-2 border-border">
                  {models.length > 0 ? (
                    models.map((model) => (
                      <Select.Item 
                        key={model.id} 
                        value={model.id}
                        className="hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      >
                        {model.name}
                      </Select.Item>
                    ))
                  ) : (
                    <Select.Item value="no-models" disabled className="text-muted-foreground">
                      No favorite models - Go to Providers page to add favorites
                    </Select.Item>
                  )}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {sessionId ? (
          <>
            {/* Loading state */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <>
                {/* Memoized message list */}
                {messageListMemo}
                
                {/* Empty state */}
                {messages.length === 0 && !streamingMessage && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 mb-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    <p className="text-lg font-head font-semibold mb-2">No messages yet</p>
                    <p className="text-sm">Start the conversation by sending a message below</p>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-lg font-head font-semibold mb-2">No chat selected</p>
            <p className="text-sm">Select a chat from the sidebar or create a new one</p>
          </div>
        )}
      </div>
      
      {/* Input area */}
      {sessionId && (
        <div className="border-t-2 border-l-0 border-r-0 border-b-0 shadow-none p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={handleInputChange}
                  placeholder={t('chat.typeMessage')}
                  className="resize-none w-full p-3 border-2 border-black"
                  style={{ 
                    height: inputHeight, 
                    minHeight: `${minInputHeight}px`,
                    overflow: userInput.length > 100 ? 'auto' : 'hidden' 
                  }}
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
                disabled={(!userInput.trim() && !isGenerating && !streamingMessage && !isTypingResponse)}
                title={(isGenerating || streamingMessage || isTypingResponse) ? t('chat.stopGeneration') || "Stop generation" : t('chat.send') || "Send"}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                className="h-12 w-12 p-2 border-2 border-black bg-yellow-400 hover:bg-yellow-500"
              >
                {(isGenerating || streamingMessage || isTypingResponse) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0721.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">
              Press Shift+Enter for a new line, Enter to send
            </p>
          </form>
        </div>
      )}
    </div>
  );
} 