import { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 语言配置
const translations = {
  en: {
    // Common
    common: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      add: 'Add',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      name: 'Name',
      description: 'Description',
      settings: 'Settings',
      language: 'Language',
      theme: 'Theme',
      close: 'Close',
      copy: 'Copy',
      copied: 'Copied!',
    },
    
    // Navigation
    nav: {
      chat: 'Chat',
      providers: 'Providers',
      assistants: 'Assistants',
      settings: 'Settings',
    },
    
    // Chat
    chat: {
      newChat: 'New Chat',
      thinking: 'Thinking...',
      typeMessage: 'Type your message...',
      send: 'Send',
      stopGeneration: 'Stop Generation',
      you: 'You',
      aiAssistant: 'AI Assistant',
      selectProvider: 'Select Provider',
      selectModel: 'Select Model',
      selectChat: 'Select a chat',
      noProviders: 'No providers available. Please add a provider first.',
      noModels: 'No models available for this provider.',
      noMessages: 'No messages yet',
      noChatSelected: 'No chat selected',
      startConversation: 'Start the conversation by sending a message below',
      selectChatFromSidebar: 'Select a chat from the sidebar or create a new one',
      inputHint: 'Press Shift+Enter for a new line, Enter to send',
    },
    
    // Sidebar
    sidebar: {
      searchChats: 'Search chats...',
      noSearchResults: 'No chats found',
      noChats: 'No chats yet',
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      older: 'Older',
    },
    
    // Providers
    providers: {
      title: 'AI Providers',
      addProvider: 'Add Provider',
      fetchModels: 'Fetch Models',
      addModel: 'Add Model',
      verifyAll: 'Verify All',
      showMore: 'Show {count} more',
      showLess: 'Show less',
      verifySummary: 'Verification finished: {success}/{total} succeeded, {failed} failed.',
      providerType: 'Provider Type',
      apiUrl: 'API URL',
      apiKey: 'API Key',
      apiKeyName: 'API Key Name',
      noProviders: 'No providers configured yet.',
      addFirstProvider: 'Add your first AI provider to get started.',
      confirmDelete: 'Confirm Delete',
      confirmDeleteProvider: 'Are you sure you want to delete provider "{name}"?',
      confirmDeleteModel: 'Are you sure you want to delete model "{name}"?',
      cannotUndo: 'This action cannot be undone.',
      deleteSuccess: 'Deleted successfully',
      fetchSuccess: 'Successfully fetched {count} models.',
      addModelTitle: 'Add Model',
      addModelPrompt: 'Please enter the model name:',
      modelNamePlaceholder: 'e.g., gpt-4o, claude-3-sonnet, gemini-pro',
      failedToSave: 'Failed to save provider',
      failedToDelete: 'Failed to delete provider',
      failedToFetch: 'Failed to fetch models',
      failedToAddModel: 'Failed to add model',
      failedToDeleteModel: 'Failed to delete model',
    },
    
    // Assistants
    assistants: {
      title: 'AI Assistants',
      addAssistant: 'Add Assistant',
      systemPrompt: 'System Prompt',
      noAssistants: 'No assistants created yet.',
      addFirstAssistant: 'Create your first AI assistant.',
      confirmDelete: 'Are you sure you want to delete this assistant?',
      deleteSuccess: 'Assistant deleted successfully',
      failedToSave: 'Failed to save assistant',
      failedToDelete: 'Failed to delete assistant',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      appearance: 'Appearance',
      language: 'Language',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      languageEn: 'English',
      languageZh: '中文',
    },
    
    // Messages
    messages: {
      sessionDeleted: 'Session deleted successfully',
      providerDeleted: 'Provider deleted successfully',
      modelDeleted: 'Model deleted successfully',
      assistantDeleted: 'Assistant deleted successfully',
      settingsSaved: 'Settings saved successfully',
    },
    
    // Errors
    errors: {
      sessionIdMissing: 'Error: Session ID is missing',
      providerNotFound: 'Provider not found',
      modelNotFound: 'Model not found',
      apiKeyNotSet: 'API key not set for this provider. Please set an API key in the Providers page.',
      fetchingNotImplemented: 'Fetching models not implemented for this provider',
      customProviderError: 'Custom provider API error: {error}. This provider might not support model listing or might not be OpenAI-compatible.',
      unknownProviderType: 'Unknown provider type \'{type}\', tried OpenAI-compatible API: {error}',
      unsupportedProvider: 'Unsupported provider: {provider}',
    }
  },
  
  zh: {
    // Common
    common: {
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      edit: '编辑',
      save: '保存',
      add: '添加',
      loading: '加载中...',
      error: '错误',
      success: '成功',
      name: '名称',
      description: '描述',
      settings: '设置',
      language: '语言',
      theme: '主题',
      close: '关闭',
      copy: '复制',
      copied: '已复制！',
    },
    
    // Navigation
    nav: {
      chat: '聊天',
      providers: '提供商',
      assistants: '助手',
      settings: '设置',
    },
    
    // Chat
    chat: {
      newChat: '新建聊天',
      thinking: '思考中...',
      typeMessage: '输入您的消息...',
      send: '发送',
      stopGeneration: '停止生成',
      you: '您',
      aiAssistant: 'AI助手',
      selectProvider: '选择提供商',
      selectModel: '选择模型',
      selectChat: '选择聊天',
      noProviders: '没有可用的提供商。请先添加一个提供商。',
      noModels: '此提供商没有可用的模型。',
      noMessages: '暂无消息',
      noChatSelected: '未选择聊天',
      startConversation: '在下方发送消息开始对话',
      selectChatFromSidebar: '从侧边栏选择聊天或创建新聊天',
      inputHint: '按 Shift+Enter 换行，Enter 发送',
    },
    
    // Sidebar
    sidebar: {
      searchChats: '搜索聊天...',
      noSearchResults: '未找到聊天',
      noChats: '暂无聊天',
      today: '今天',
      yesterday: '昨天',
      thisWeek: '本周',
      older: '更早',
    },
    
    // Providers
    providers: {
      title: 'AI 提供商',
      addProvider: '添加提供商',
      fetchModels: '获取模型',
      addModel: '添加模型',
      verifyAll: '验证全部',
      showMore: '展开另外 {count} 个',
      showLess: '收起',
      verifySummary: '验证完成：{success}/{total} 成功，{failed} 失败。',
      providerType: '提供商类型',
      apiUrl: 'API 地址',
      apiKey: 'API 密钥',
      apiKeyName: 'API 密钥名称',
      noProviders: '尚未配置提供商。',
      addFirstProvider: '添加您的第一个 AI 提供商以开始使用。',
      confirmDelete: '确认删除',
      confirmDeleteProvider: '确认删除提供商 "{name}"？',
      confirmDeleteModel: '确认删除模型 "{name}"？',
      cannotUndo: '此操作无法撤销。',
      deleteSuccess: '删除成功',
      fetchSuccess: '成功获取 {count} 个模型。',
      addModelTitle: '添加模型',
      addModelPrompt: '请输入要添加的模型名称：',
      modelNamePlaceholder: '例如：gpt-4o, claude-3-sonnet, gemini-pro',
      failedToSave: '保存提供商失败',
      failedToDelete: '删除提供商失败',
      failedToFetch: '获取模型失败',
      failedToAddModel: '添加模型失败',
      failedToDeleteModel: '删除模型失败',
    },
    
    // Assistants
    assistants: {
      title: 'AI 助手',
      addAssistant: '添加助手',
      systemPrompt: '系统提示',
      noAssistants: '尚未创建助手。',
      addFirstAssistant: '创建您的第一个 AI 助手。',
      confirmDelete: '确认删除此助手？',
      deleteSuccess: '助手删除成功',
      failedToSave: '保存助手失败',
      failedToDelete: '删除助手失败',
    },
    
    // Settings
    settings: {
      title: '设置',
      appearance: '外观',
      language: '语言',
      theme: '主题',
      themeLight: '浅色',
      themeDark: '深色',
      themeSystem: '跟随系统',
      languageEn: 'English',
      languageZh: '中文',
    },
    
    // Messages
    messages: {
      sessionDeleted: '会话删除成功',
      providerDeleted: '提供商删除成功',
      modelDeleted: '模型删除成功',
      assistantDeleted: '助手删除成功',
      settingsSaved: '设置保存成功',
    },
    
    // Errors
    errors: {
      sessionIdMissing: '错误：会话 ID 缺失',
      providerNotFound: '未找到提供商',
      modelNotFound: '未找到模型',
      apiKeyNotSet: '此提供商未设置 API 密钥。请在提供商页面设置 API 密钥。',
      fetchingNotImplemented: '此提供商尚未实现模型获取功能',
      customProviderError: '自定义提供商 API 错误：{error}。此提供商可能不支持模型列表或不兼容 OpenAI。',
      unknownProviderType: '未知提供商类型 \'{type}\'，尝试 OpenAI 兼容 API：{error}',
      unsupportedProvider: '不支持的提供商：{provider}',
    }
  }
};

// 创建国际化上下文
const I18nContext = createContext();

// 国际化提供者组件
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // 从设置中加载语言
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // Check if we're running in Tauri environment
        if (window.__TAURI__) {
          const savedLanguage = await invoke('get_setting', { key: 'language' });
          if (savedLanguage && translations[savedLanguage]) {
            setLanguage(savedLanguage);
          }
        } else {
          // Use browser localStorage as fallback
          const savedLanguage = localStorage.getItem('aichat-language');
          if (savedLanguage && translations[savedLanguage]) {
            setLanguage(savedLanguage);
          }
        }
      } catch (error) {
        console.error('Failed to load language setting:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLanguage();
  }, []);

  // 切换语言
  const changeLanguage = async (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      try {
        if (window.__TAURI__) {
          await invoke('set_setting', { key: 'language', value: newLanguage });
        } else {
          // Use browser localStorage as fallback
          localStorage.setItem('aichat-language', newLanguage);
        }
      } catch (error) {
        console.error('Failed to save language setting:', error);
      }
    }
  };

  // 获取翻译文本
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    if (typeof value === 'string') {
      // 替换参数
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }
    
    // 如果找不到翻译，返回 key
    return key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    isLoading,
    availableLanguages: Object.keys(translations)
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// 使用国际化的 Hook
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export default translations;
