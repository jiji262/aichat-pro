import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";

export default function AssistantsPage() {
  const { t } = useI18n();
  const [assistants, setAssistants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssistantId, setEditingAssistantId] = useState(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, assistant: null });
  
  // Load assistants
  useEffect(() => {
    loadAssistants();
  }, []);
  
  async function loadAssistants() {
    try {
      setIsLoading(true);
      
      let allAssistants;
      if (window.__TAURI__) {
        allAssistants = await invoke("get_assistants");
      } else {
        // Mock data for browser environment
        allAssistants = [
          {
            id: "mock-assistant-1",
            name: "Mock Coding Assistant",
            description: "Helps with coding tasks",
            system_prompt: "You are a helpful coding assistant."
          }
        ];
      }
      
      setAssistants(allAssistants);
    } catch (error) {
      console.error("Failed to load assistants:", error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function openAddForm() {
    setShowForm(true);
    setEditingAssistantId(null);
    setFormName("");
    setFormDescription("");
    setFormSystemPrompt("");
  }
  
  function openEditForm(assistant) {
    setShowForm(true);
    setEditingAssistantId(assistant.id);
    setFormName(assistant.name);
    setFormDescription(assistant.description);
    setFormSystemPrompt(assistant.system_prompt);
  }
  
  function cancelForm() {
    setShowForm(false);
    setEditingAssistantId(null);
    setFormName("");
    setFormDescription("");
    setFormSystemPrompt("");
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formName || !formSystemPrompt) return;
    
    try {
      if (window.__TAURI__) {
        if (editingAssistantId) {
          // Update existing assistant
          await invoke("update_assistant", {
            assistant: {
              id: editingAssistantId,
              name: formName,
              description: formDescription || "", // Empty string if not provided
              system_prompt: formSystemPrompt
            }
          });
        } else {
          // Add new assistant
          await invoke("create_assistant", {
            assistant: {
              name: formName,
              description: formDescription || "", // Empty string if not provided
              system_prompt: formSystemPrompt
            }
          });
        }
      }
      // In browser environment, just skip the API call
      
      // Reload assistants
      await loadAssistants();
      
      // Reset form
      cancelForm();
    } catch (error) {
      console.error("Failed to save assistant:", error);
      console.log(t('assistants.failedToSave') + ": " + error);
    }
  }
  
  function showDeleteDialog(assistant) {
    console.log("=== DELETE ASSISTANT BUTTON CLICKED ===");
    console.log("Assistant ID:", assistant.id);
    console.log("Assistant object:", assistant);
    setDeleteConfirm({ show: true, assistant: assistant });
  }

  async function confirmDelete() {
    const assistant = deleteConfirm.assistant;
    if (!assistant) return;

    console.log("=== CONFIRMING DELETE ASSISTANT ===");
    console.log("Assistant ID:", assistant.id);

    try {
      console.log("Step 1: User confirmed, calling backend API");

      // 先从本地状态中移除
      setAssistants(prev => prev.filter(a => a.id !== assistant.id));

      // 然后发送删除请求到后端
      if (window.__TAURI__) {
        const result = await invoke("delete_assistant", { id: assistant.id });
        console.log("Step 2: Backend API response:", result);
      }
      // In browser environment, just skip the API call

      // 关闭确认对话框
      setDeleteConfirm({ show: false, assistant: null });

      // 显示成功消息
      console.log(t('assistants.deleteSuccess'));
    } catch (error) {
      console.error("=== DELETE ASSISTANT ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.log(t('assistants.failedToDelete') + ": " + error);

      // 如果失败，重新加载以恢复状态
      await loadAssistants();

      // 关闭确认对话框
      setDeleteConfirm({ show: false, assistant: null });
    }
  }

  function cancelDelete() {
    console.log("Delete assistant cancelled by user");
    setDeleteConfirm({ show: false, assistant: null });
  }
  
  function renderAssistantCard(assistant) {
    return (
      <div key={assistant.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">{assistant.name}</h2>
          <div className="space-x-2">
            <button
              onClick={() => openEditForm(assistant)}
              className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              Edit
            </button>
            <button
              onClick={() => showDeleteDialog(assistant)}
              className="px-3 py-1 bg-red-600 text-white dark:bg-red-700 dark:text-white rounded-md text-sm hover:bg-red-700 dark:hover:bg-red-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t('common.delete')}
            </button>
          </div>
        </div>
        
        {assistant.description && (
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            {assistant.description}
          </p>
        )}
        
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Prompt:</h3>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md overflow-auto max-h-40 text-sm whitespace-pre-wrap">
            {assistant.system_prompt}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('assistants.title')}</h1>
        <button
          onClick={openAddForm}
          className="btn btn-primary"
        >
          {t('assistants.addAssistant')}
        </button>
      </div>
      
      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingAssistantId ? t('common.edit') + ' ' + t('assistants.title').slice(0, -1) : t('assistants.addAssistant')}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.name')}
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Coding Assistant"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.description')}
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g., An assistant that helps with coding tasks"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('assistants.systemPrompt')}
              </label>
              <textarea
                value={formSystemPrompt}
                onChange={(e) => setFormSystemPrompt(e.target.value)}
                placeholder="Detailed instructions for the AI assistant..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows="8"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelForm}
                className="btn btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editingAssistantId ? t('common.save') : t('assistants.addAssistant')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Assistants List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
        </div>
      ) : assistants.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('assistants.noAssistants')}</p>
          <button
            onClick={openAddForm}
            className="btn btn-primary"
          >
            {t('assistants.addFirstAssistant')}
          </button>
        </div>
      ) : (
        <div>
          {assistants.map(renderAssistantCard)}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('providers.confirmDelete')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('assistants.confirmDelete')}
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
    </div>
  );
}