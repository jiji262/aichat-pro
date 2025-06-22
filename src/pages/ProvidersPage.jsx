import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";

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
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, provider: null });
  const [addModelDialog, setAddModelDialog] = useState({ show: false, providerId: null, modelName: "" });
  const [deleteModelConfirm, setDeleteModelConfirm] = useState({ show: false, model: null, providerId: null });
  
  // Load providers
  useEffect(() => {
    loadProviders();
  }, []);
  
  async function loadProviders() {
    try {
      setIsLoading(true);
      const allProviders = await invoke("get_providers");
      setProviders(allProviders);
      
      // Initialize edit forms for each provider
      const initialForms = {};
      allProviders.forEach(provider => {
        initialForms[provider.id] = {
          name: provider.name,
          apiUrl: provider.api_url,
          apiKey: provider.api_key || ""
        };
      });
      setEditForms(initialForms);
      
      // Load models for each provider
      allProviders.forEach(provider => {
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
        setFormApiUrl(""); // 清空 API URL
        break;
      default:
        // 不应该到达这里
        break;
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formName || !formApiUrl) return;
    
    try {
      // Add new provider
      if (!formApiKey) return; // API key is required for new providers
      
      // 根据类型设置 ID 前缀
      const idPrefix = formType !== "custom" ? formType : "custom";
      
      await invoke("add_provider", {
        provider: {
          name: formName,
          api_url: formApiUrl,
          api_key: formApiKey,
          id_prefix: idPrefix // 传递 ID 前缀给后端
        }
      });
      
      // Reload providers
      await loadProviders();
      
      // Reset form
      cancelForm();
    } catch (error) {
      console.error("Failed to save provider:", error);
      console.log(t('providers.failedToSave') + ": " + error);
    }
  }
  
  async function handleUpdateProvider(providerId) {
    const form = editForms[providerId];
    if (!form || !form.name || !form.apiUrl) return;
    
    try {
      await invoke("update_provider", {
        provider: {
          id: providerId,
          name: form.name,
          api_url: form.apiUrl,
          api_key: form.apiKey || undefined // Only send if filled
        }
      });
      
      // Reload providers
      await loadProviders();
      
      // Exit edit mode
      setEditingProviderId(null);
    } catch (error) {
      console.error("Failed to update provider:", error);
      console.log(t('providers.failedToSave') + ": " + error);
    }
  }
  
  const confirmDelete = async () => {
    const provider = deleteConfirm.provider;
    if (!provider) return;

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
  
  function renderProviderCard(provider) {
    const models = modelsMap[provider.id] || [];
    const isLoading = loadingModels[provider.id] || false;
    const isEditing = editingProviderId === provider.id;
    const editForm = editForms[provider.id] || { name: "", apiUrl: "", apiKey: "" };
    
    return (
      <div key={provider.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">

        <div className="flex justify-between items-start mb-4">
          {isEditing ? (
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => handleEditFormChange(provider.id, 'name', e.target.value)}
              className="text-xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
              placeholder="Provider Name"
            />
          ) : (
            <h2 className="text-xl font-semibold">{provider.name}</h2>
          )}
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => handleUpdateProvider(provider.id)}
                  className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-800"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => setEditingProviderId(null)}
                  className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    console.log("Edit button clicked for provider:", provider.id);
                    toggleEditProvider(provider.id);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  {t('common.edit')}
                </button>

                <button
                  onClick={() => {
                    console.log("=== DELETE BUTTON CLICKED ===");
                    console.log("Provider ID:", provider.id);
                    console.log("Provider object:", provider);
                    setDeleteConfirm({ show: true, provider: provider });
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                >
                  🗑️ {t('common.delete')}
                </button>
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
          <h3 className="text-lg font-medium">Models</h3>
          <div className="space-x-2">
            <button
              onClick={() => fetchModelsFromProvider(provider.id)}
              className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-800"
              disabled={isLoading || !provider.api_key}
            >
              {isLoading ? t('common.loading') : t('providers.fetchModels')}
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
                className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-800"
                disabled={isLoading || !provider.api_key}
              >
                {t('providers.fetchModels')}
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1 mt-2">
            {models.map((model) => (
              <li key={model.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span>{model.name}</span>
                <button
                  onClick={() => showDeleteModelDialog(model, provider.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('providers.title')}</h1>
        <button
          onClick={openAddForm}
          className="btn btn-primary flex items-center justify-center min-w-[120px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('providers.addProvider')}
        </button>
      </div>
      
      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('providers.addProvider')}
          </h2>
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
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
      )}
      
      {/* Providers List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('providers.noProviders')}</p>
          <button
            onClick={openAddForm}
            className="btn btn-primary"
          >
            {t('providers.addFirstProvider')}
          </button>
        </div>
      ) : (
        <div>
          {providers.map(renderProviderCard)}
        </div>
      )}

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