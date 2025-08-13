import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";
import FavoriteButton from "../components/FavoriteButton.jsx";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Input } from "@/components/retroui/Input";
import { Select } from "@/components/retroui/Select";

export default function ProvidersPage() {
  const { t } = useI18n();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProviderId, setEditingProviderId] = useState(null);
  
  // Form state for each provider
  const [editForms, setEditForms] = useState({});
  
  // Form state for new provider
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formApiUrl, setFormApiUrl] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formType, setFormType] = useState("custom");
  
  const [modelsMap, setModelsMap] = useState({});
  const [loadingModels, setLoadingModels] = useState({});
  const [expandedProviders, setExpandedProviders] = useState({}); // 控制各提供商模型折叠/展开
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, provider: null });
  const [addModelDialog, setAddModelDialog] = useState({ show: false, providerId: null, modelName: "" });
  const [deleteModelConfirm, setDeleteModelConfirm] = useState({ show: false, model: null, providerId: null });
  const [verificationStatus, setVerificationStatus] = useState({});
  const [verifyingAll, setVerifyingAll] = useState({});
  
  const scrollableContainerRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(null);

  // Load providers
  useEffect(() => {
    loadProviders();
  }, []);
  
  useEffect(() => {
    if (scrollPosition !== null && scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTop = scrollPosition;
      setScrollPosition(null); // Reset after restoring
    }
  }, [providers, scrollPosition]);
  
  async function loadProviders() {
    try {
      setIsLoading(true);
      const allProviders = await invoke("get_providers");
      
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
      
      // Initialize edit forms for each provider
      const initialForms = {};
      filteredProviders.forEach(provider => {
        initialForms[provider.id] = {
          name: provider.name,
          apiUrl: provider.api_url,
          apiKey: provider.api_key || ""
        };
      });
      setEditForms(initialForms);
      
      // Load models for each provider
      filteredProviders.forEach(provider => {
        loadModelsForProvider(provider.id);
      });
    } catch (error) {
      console.error("Failed to load providers:", error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function loadModelsForProvider(providerId) {
    try {
      setLoadingModels(prev => ({ ...prev, [providerId]: true }));
      const models = await invoke("get_models", { providerId });
      setModelsMap(prev => ({ ...prev, [providerId]: models }));
    } catch (error) {
      console.error(`Failed to load models for provider ${providerId}:`, error);
    } finally {
      setLoadingModels(prev => ({ ...prev, [providerId]: false }));
    }
  }
  
  function openAddForm() {
    setShowAddForm(true);
    setEditingProviderId(null);
    setFormName("");
    setFormApiUrl("");
    setFormApiKey("");
    setFormType("custom");
  }
  
  function toggleEditProvider(providerId) {
    setEditingProviderId(editingProviderId === providerId ? null : providerId);
  }
  
  function cancelForm() {
    setShowAddForm(false);
    setEditingProviderId(null);
    setFormName("");
    setFormApiUrl("");
    setFormApiKey("");
    setFormType("custom");
  }
  
  function handleEditFormChange(providerId, field, value) {
    setEditForms(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value
      }
    }));
  }
  
  function handleTypeChange(type) {
    setFormType(type);
    
    // 根据类型设置默认 API URL
    switch (type) {
      case "openai":
        setFormApiUrl("https://api.openai.com");
        break;
      case "claude":
        setFormApiUrl("https://api.anthropic.com");
        break;
      case "gemini":
        setFormApiUrl("https://generativelanguage.googleapis.com");
        break;
      case "deepseek":
        setFormApiUrl("https://api.deepseek.com");
        break;
      case "grok":
        setFormApiUrl("https://api.grok.x.ai");
        break;
      case "custom":
        setFormApiUrl(""); // 清空 API URL，但将使用OpenAI API标准
        break;
      default:
        // 不应该到达这里
        break;
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (scrollableContainerRef.current) {
      setScrollPosition(scrollableContainerRef.current.scrollTop);
    }

    if (!formName || !formApiUrl) return;
    
    try {
      // Add new provider
      if (!formApiKey) return; // API key is required for new providers
      
      // 自定义提供商使用OpenAI API格式
      const idPrefix = formType !== "custom" ? formType : "openai";
      
      await invoke("add_provider", {
        provider: {
          name: formName,
          api_url: formApiUrl,
          api_key: formApiKey,
          id_prefix: idPrefix // 传递 ID 前缀给后端，custom类型使用openai作为前缀
        }
      });
      
      await loadProviders();
      cancelForm();
    } catch (error) {
      console.error("Failed to save provider:", error);
      console.log(t('providers.failedToSave') + ": " + error);
    }
  }
  
  async function handleUpdateProvider(providerId) {
    const form = editForms[providerId];
    if (!form || !form.name || !form.apiUrl) return;

    if (scrollableContainerRef.current) {
      setScrollPosition(scrollableContainerRef.current.scrollTop);
    }
    
    try {
      await invoke("update_provider", {
        provider: {
          id: providerId,
          name: form.name,
          api_url: form.apiUrl,
          api_key: form.apiKey || undefined // Only send if filled
        }
      });
      
      await loadProviders();
      setEditingProviderId(null);
    } catch (error) {
      console.error("Failed to update provider:", error);
      console.log(t('providers.failedToSave') + ": " + error);
    }
  }
  
  const confirmDelete = async () => {
    const provider = deleteConfirm.provider;
    if (!provider) return;

    if (scrollableContainerRef.current) {
      setScrollPosition(scrollableContainerRef.current.scrollTop);
    }

    console.log("=== CONFIRMING DELETE ===");
    console.log("Provider ID:", provider.id);

    try {
      console.log("Step 1: User confirmed, calling backend API");
      console.log("Calling invoke with:", { id: provider.id });

      // 调用后端删除API
      const result = await invoke("delete_provider", { id: provider.id });
      console.log("Step 2: Backend API response:", result);

      console.log("Step 3: Reloading providers list");
      // 重新加载providers列表
      await loadProviders();
      console.log("Step 4: Providers list reloaded");

      // 关闭确认对话框
      setDeleteConfirm({ show: false, provider: null });

      console.log("Step 5: Provider删除成功");
    } catch (error) {
      console.error("=== DELETE ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      // 关闭确认对话框
      setDeleteConfirm({ show: false, provider: null });
    }
  };

  const cancelDelete = () => {
    console.log("Delete cancelled by user");
    setDeleteConfirm({ show: false, provider: null });
  };
  
  function showAddModelDialog(providerId) {
    console.log("=== ADD MODEL BUTTON CLICKED ===");
    console.log("Provider ID:", providerId);
    setAddModelDialog({ show: true, providerId: providerId, modelName: "" });
  }

  async function confirmAddModel() {
    const { providerId, modelName } = addModelDialog;
    if (!providerId || !modelName.trim()) return;

    console.log("=== CONFIRMING ADD MODEL ===");
    console.log("Provider ID:", providerId);
    console.log("Model Name:", modelName);

    try {
      console.log("Step 1: Calling backend API");
      await invoke("add_model", {
        model: {
          provider_id: providerId,
          name: modelName.trim()
        }
      });
      console.log("Step 2: Model added successfully");

      // Reload models for this provider
      console.log("Step 3: Reloading models");
      await loadModelsForProvider(providerId);
      console.log("Step 4: Models reloaded");

      // Close dialog
      setAddModelDialog({ show: false, providerId: null, modelName: "" });
      console.log("Step 5: Add model completed successfully");
    } catch (error) {
      console.error("=== ADD MODEL ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);

      // Close dialog
      setAddModelDialog({ show: false, providerId: null, modelName: "" });
    }
  }

  function cancelAddModel() {
    console.log("Add model cancelled by user");
    setAddModelDialog({ show: false, providerId: null, modelName: "" });
  }
  
  function showDeleteModelDialog(model, providerId) {
    console.log("=== DELETE MODEL BUTTON CLICKED ===");
    console.log("Model ID:", model.id);
    console.log("Model Name:", model.name);
    console.log("Provider ID:", providerId);
    setDeleteModelConfirm({ show: true, model: model, providerId: providerId });
  }

  async function confirmDeleteModel() {
    const { model, providerId } = deleteModelConfirm;
    if (!model || !providerId) return;

    console.log("=== CONFIRMING DELETE MODEL ===");
    console.log("Model ID:", model.id);
    console.log("Model Name:", model.name);
    console.log("Provider ID:", providerId);

    try {
      console.log("Step 1: Calling backend API");
      await invoke("delete_model", { id: model.id });
      console.log("Step 2: Model deleted successfully");

      // Reload models for this provider
      console.log("Step 3: Reloading models");
      await loadModelsForProvider(providerId);
      console.log("Step 4: Models reloaded");

      // Close dialog
      setDeleteModelConfirm({ show: false, model: null, providerId: null });
      console.log("Step 5: Delete model completed successfully");
    } catch (error) {
      console.error("=== DELETE MODEL ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);

      // Close dialog
      setDeleteModelConfirm({ show: false, model: null, providerId: null });
    }
  }

  function cancelDeleteModel() {
    console.log("Delete model cancelled by user");
    setDeleteModelConfirm({ show: false, model: null, providerId: null });
  }
  
  async function fetchModelsFromProvider(providerId) {
    try {
      setLoadingModels(prev => ({ ...prev, [providerId]: true }));
      const models = await invoke("fetch_models_from_provider", { providerId });
      
      // For each fetched model, add it if it doesn't already exist
      for (const modelName of models) {
        // Check if model already exists
        const existingModels = modelsMap[providerId] || [];
        const exists = existingModels.some(m => m.name === modelName);
        
        if (!exists) {
          await invoke("add_model", {
            model: {
              provider_id: providerId,
              name: modelName
            }
          });
        }
      }
      
      // Reload models for this provider
      await loadModelsForProvider(providerId);
      
      console.log(t('providers.fetchSuccess', { count: models.length }));
    } catch (error) {
      console.error("Failed to fetch models:", error);
      console.log(t('providers.failedToFetch') + ": " + error);
    } finally {
      setLoadingModels(prev => ({ ...prev, [providerId]: false }));
    }
  }
  
  async function handleVerifyModel(providerId, model) {
    setVerificationStatus(prev => ({
      ...prev,
      [model.id]: { status: 'verifying' }
    }));

    try {
      const result = await invoke("verify_model", {
        request: {
          provider_id: providerId,
          model_name: model.name,
        }
      });

      // Check the actual result from the backend
      if (result === true) {
        setVerificationStatus(prev => ({
          ...prev,
          [model.id]: { status: 'verified' }
        }));
        return true;
      } else {
        setVerificationStatus(prev => ({
          ...prev,
          [model.id]: { status: 'failed', message: 'Model verification failed' }
        }));
        return false;
      }
    } catch (error) {
      console.error(`Failed to verify model ${model.name}:`, error);
      setVerificationStatus(prev => ({
        ...prev,
        [model.id]: { status: 'error', message: error }
      }));
      return false;
    }
  }

  async function handleVerifyAllModels(providerId) {
    const models = modelsMap[providerId] || [];
    if (!models.length) return;

    setVerifyingAll(prev => ({ ...prev, [providerId]: true }));

    // Mark all as verifying first for immediate UI feedback
    setVerificationStatus(prev => {
      const updated = { ...prev };
      models.forEach(m => {
        updated[m.id] = { status: 'verifying' };
      });
      return updated;
    });

    // Concurrency-limited verification to balance speed and rate limits
    const CONCURRENCY = 4;
    let successCount = 0;
    let failedCount = 0;
    let idx = 0;
    const worker = async () => {
      while (true) {
        const current = idx++;
        if (current >= models.length) break;
        const model = models[current];
        try {
          const ok = await handleVerifyModel(providerId, model);
          if (ok) successCount += 1; else failedCount += 1;
        } catch (e) {
          // Individual failures are already reflected by handleVerifyModel
          failedCount += 1;
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, models.length) }, () => worker());
    await Promise.all(workers);

    setVerifyingAll(prev => ({ ...prev, [providerId]: false }));

    const total = models.length;
    try {
      alert(t('providers.verifySummary', { total, success: successCount, failed: failedCount }));
    } catch (_) {
      console.log('Verify summary:', { total, success: successCount, failed: failedCount });
    }
  }

  // Handle favorite toggle
  const handleFavoriteToggle = (modelId, isFavorite) => {
    // Update the models map to reflect the new favorite status
    setModelsMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(providerId => {
        updated[providerId] = updated[providerId].map(model => 
          model.id === modelId 
            ? { ...model, is_favorite: isFavorite }
            : model
        );
      });
      return updated;
    });
  };
  
  function renderProviderCard(provider) {
    const models = modelsMap[provider.id] || [];
    const isLoading = loadingModels[provider.id] || false;
    const isEditing = editingProviderId === provider.id;
    const editForm = editForms[provider.id] || { name: "", apiUrl: "", apiKey: "" };
    
    const providerType = determine_provider_type(provider.id, provider.api_url, provider.name);
    const supportsModelFetching = providerType !== 'claude'; // Claude does not support fetching
    
    const MAX_VISIBLE_MODELS = 3;
    const isExpanded = !!expandedProviders[provider.id];
    const visibleModels = isExpanded ? models : models.slice(0, MAX_VISIBLE_MODELS);
    const hiddenCount = Math.max(0, models.length - MAX_VISIBLE_MODELS);

    return (
      <Card key={provider.id} className="p-6 shadow-retro-md">
        <div className="flex justify-between items-start mb-4">
          {isEditing ? (
            <Input
              type="text"
              value={editForm.name}
              onChange={(e) => handleEditFormChange(provider.id, 'name', e.target.value)}
              className="text-xl font-head font-semibold border-b-2 border-l-0 border-r-0 border-t-0 shadow-none bg-transparent"
              placeholder="Provider Name"
            />
          ) : (
            <Text as="h2" className="text-xl font-head font-semibold">{provider.name}</Text>
          )}
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={() => handleUpdateProvider(provider.id)}
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {t('common.save')}
                </Button>
                <Button
                  onClick={() => setEditingProviderId(null)}
                  variant="outline"
                  size="sm"
                >
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    console.log("Edit button clicked for provider:", provider.id);
                    toggleEditProvider(provider.id);
                  }}
                  variant="outline"
                  size="sm"
                >
                  {t('common.edit')}
                </Button>

                <Button
                  onClick={() => {
                    console.log("=== DELETE BUTTON CLICKED ===");
                    console.log("Provider ID:", provider.id);
                    console.log("Provider object:", provider);
                    setDeleteConfirm({ show: true, provider: provider });
                  }}
                  variant="destructive"
                  size="sm"
                >
                  🗑️ {t('common.delete')}
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="mb-1">
          <span className="font-medium">API URL:</span>{" "}
          {isEditing ? (
            <input
              type="text"
              value={editForm.apiUrl}
              onChange={(e) => handleEditFormChange(provider.id, 'apiUrl', e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="https://api.example.com"
            />
          ) : (
            <span className="text-gray-600 dark:text-gray-300">{provider.api_url}</span>
          )}
        </div>
        
        <div className="mb-4">
          <span className="font-medium">API Key:</span>{" "}
          {isEditing ? (
            <input
              type="text"
              value={editForm.apiKey}
              onChange={(e) => handleEditFormChange(provider.id, 'apiKey', e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono"
              placeholder="Enter API key"
            />
          ) : (
            provider.api_key ? 
              <span className="font-mono text-gray-600 dark:text-gray-300">{provider.api_key}</span> : 
              <span className="text-red-500 italic">Not set</span>
          )}
        </div>
        
        <div className="mt-6 mb-3 flex justify-between items-center">
          <h3 className="text-lg font-medium">
            Models <span className="ml-1 text-sm text-gray-500">({models.length})</span>
          </h3>
          <div className="space-x-2">
            <button
              onClick={() => fetchModelsFromProvider(provider.id)}
              className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading || !provider.api_key || !supportsModelFetching}
              title={!supportsModelFetching ? t('providers.manualAddModelTooltip') : ''}
            >
              {isLoading ? t('common.loading') : t('providers.fetchModels')}
            </button>
            <button
              onClick={() => handleVerifyAllModels(provider.id)}
              className="px-3 py-1 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={(models.length === 0) || verifyingAll[provider.id]}
            >
              {verifyingAll[provider.id] ? t('common.loading') : t('providers.verifyAll')}
            </button>
            <button
              onClick={() => showAddModelDialog(provider.id)}
              className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              {t('providers.addModel')}
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-2">{t('chat.noModels')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Add models manually or fetch them from the provider's API</p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => showAddModelDialog(provider.id)}
                className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                {t('providers.addModel')}
              </button>
              <button
                onClick={() => fetchModelsFromProvider(provider.id)}
                className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={isLoading || !provider.api_key || !supportsModelFetching}
                title={!supportsModelFetching ? t('providers.manualAddModelTooltip') : ''}
              >
                {t('providers.fetchModels')}
              </button>
            </div>
          </div>
        ) : (
          <>
          <ul className="space-y-1 mt-2">
            {visibleModels.map((model) => {
              const status = verificationStatus[model.id] || {};
              return (
                <li key={model.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="truncate pr-4">{model.name}</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {status.status === 'verifying' && (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" title="Verifying..."></div>
                    )}
                    {status.status === 'verified' && (
                      <span title="Verified successfully!" className="text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                    {(status.status === 'error' || status.status === 'failed') && (
                      <span title={`Verification failed: ${status.message || 'Unknown error'}`} className="text-red-500 cursor-help">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                    
                    <FavoriteButton 
                      model={model} 
                      onToggle={handleFavoriteToggle}
                    />

                    <button
                      onClick={() => handleVerifyModel(provider.id, model)}
                      className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                      disabled={status.status === 'verifying'}
                    >
                      Verify
                    </button>

                    <button
                      onClick={() => showDeleteModelDialog(model, provider.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {hiddenCount > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpandedProviders(prev => ({ ...prev, [provider.id]: !isExpanded }))}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                {isExpanded ? t('providers.showLess') : t('providers.showMore', { count: hiddenCount })}
              </button>
            </div>
          )}
          </>
        )}
      </Card>
    );
  }
  
  // Helper function to determine provider type on the frontend
  function determine_provider_type(provider_id, api_url, provider_name) {
    if (provider_id.startsWith("claude")) return "claude";
    if (provider_id.startsWith("openai")) return "openai";
    if (provider_id.startsWith("gemini")) return "gemini";
    if (provider_id.startsWith("deepseek")) return "deepseek";
    if (provider_id.startsWith("grok")) return "grok";
    if (api_url.includes("anthropic.com")) return "claude";
    if ((provider_name || "").toLowerCase().includes("claude")) return "claude";
    return "custom";
  }
  
  return (
    <div className="flex flex-col h-screen">
      {/* 固定顶部标题栏 */}
      <Card className="sticky top-0 z-10 border-b-2 border-l-0 border-r-0 border-t-0 shadow-retro-md p-6">
        <div className="flex justify-between items-center">
          <Text as="h1" className="text-2xl font-head font-bold">{t('providers.title')}</Text>
          <Button
            onClick={openAddForm}
            variant="default"
            className="min-w-[140px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('providers.addProvider')}
          </Button>
        </div>
      </Card>
      
      {/* 可滚动内容区域 */}
      <div ref={scrollableContainerRef} className="flex-1 overflow-y-auto p-6 pt-2">
        
        {/* Providers List */}
        {isLoading && providers.length === 0 ? (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto"></div>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center p-8">
            <Text className="text-muted-foreground mb-6">{t('providers.noProviders')}</Text>
            <Button
              onClick={openAddForm}
              variant="default"
            >
              {t('providers.addFirstProvider')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {providers.map(renderProviderCard)}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('providers.confirmDelete')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('providers.confirmDeleteProvider', { name: deleteConfirm.provider?.name })}
              <br />
              <span className="text-red-500 text-sm">{t('providers.cannotUndo')}</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Provider Dialog */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t('providers.addProvider')}</h2>
              <button
                onClick={cancelForm}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('providers.providerType')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("openai")}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formType === "openai"
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("claude")}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      formType === "claude" 
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300" 
                        : "bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Claude
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("gemini")}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      formType === "gemini" 
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300" 
                        : "bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("deepseek")}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      formType === "deepseek" 
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300" 
                        : "bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    }`}
                  >
                    DeepSeek
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("grok")}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      formType === "grok" 
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300" 
                        : "bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Grok
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("custom")}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      formType === "custom" 
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300" 
                        : "bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {formType === "custom" && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-0">
                    <span className="italic">Note: Custom providers will use the OpenAI API standard.</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.name')}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`e.g., My ${formType === "custom" ? "Custom" : formType.charAt(0).toUpperCase() + formType.slice(1)} Provider`}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('providers.apiUrl')}
                </label>
                <input
                  type="url"
                  value={formApiUrl}
                  onChange={(e) => setFormApiUrl(e.target.value)}
                  placeholder="e.g., https://api.example.com"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('providers.apiKey')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="Enter API key"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center justify-center min-w-[120px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t('providers.addProvider')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Model Dialog */}
      {addModelDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('providers.addModelTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('providers.addModelPrompt')}
            </p>
            <input
              type="text"
              value={addModelDialog.modelName}
              onChange={(e) => setAddModelDialog(prev => ({ ...prev, modelName: e.target.value }))}
              placeholder={t('providers.modelNamePlaceholder')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white mb-6"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  confirmAddModel();
                }
              }}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelAddModel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmAddModel}
                disabled={!addModelDialog.modelName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {t('providers.addModel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Model Confirmation Dialog */}
      {deleteModelConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('providers.confirmDelete')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('providers.confirmDeleteModel', { name: deleteModelConfirm.model?.name })}
              <br />
              <span className="text-red-500 text-sm">{t('providers.cannotUndo')}</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteModel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteModel}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
