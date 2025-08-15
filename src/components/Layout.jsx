import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import { Text } from "@/components/retroui/Text";

// Sidebar component for navigation
function Sidebar() {
  const { t } = useI18n();
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState("");
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, sessionId: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, session: null });
  const location = useLocation();
  const navigate = useNavigate();
  const editInputRef = useRef(null);

  // Load chat sessions function
  const loadChatSessions = async () => {
    try {
      setIsLoading(true);
      const sessions = await invoke("get_chat_sessions");
      setChatSessions(sessions);
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load chat sessions
  useEffect(() => {
    loadChatSessions();
  }, [location.pathname]); // Reload when path changes

  // Focus input when editing starts
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSessionId]);

  // Handle click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      // 检查点击是否在上下文菜单外部
      if (contextMenu.visible && contextMenu.sessionId && !document.querySelector('.context-menu').contains(e.target)) {
        // 检查是否点击了删除按钮
        if (e.target.closest('#delete-session-button')) {
          return;
        }
        
        // 关闭上下文菜单
        setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
      }
    };
    
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu.visible, contextMenu.sessionId]);

  // Create a new chat session
  const createNewChat = async () => {
    try {
      const id = await invoke("create_chat_session", {
        session: {
          name: t('chat.newChat'),
          model_id: null,
          system_prompt: null
        }
      });
      
      // Navigate to new chat and start editing its name
      navigate(`/chat/${id}`);
      setEditingSessionId(id);
      setEditingSessionName(t('chat.newChat'));
    } catch (error) {
      console.error("Failed to create chat session:", error);
    }
  };

  // Start editing session name
  const startEditing = (session) => {
    setEditingSessionId(session.id);
    setEditingSessionName(session.name);
  };

  // Save edited session name
  const saveSessionName = async () => {
    if (!editingSessionId || !editingSessionName.trim()) return;
    
    try {
      const session = chatSessions.find(s => s.id === editingSessionId);
      if (!session) return;
      
      await invoke("update_chat_session", {
        session: {
          id: editingSessionId,
          name: editingSessionName,
          model_id: session.model_id,
          system_prompt: session.system_prompt
        }
      });
      
      // Update local state
      setChatSessions(prev => 
        prev.map(s => s.id === editingSessionId ? { ...s, name: editingSessionName } : s)
      );
      
      // Exit editing mode
      setEditingSessionId(null);
    } catch (error) {
      console.error("Failed to update session name:", error);
    }
  };

  // Handle key press in edit input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveSessionName();
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  // Show context menu
  const handleContextMenu = (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      sessionId
    });
  };

  // Confirm delete session
  const confirmDeleteSession = async () => {
    const session = deleteConfirm.session;
    if (!session) return;

    try {
      await invoke("delete_chat_session", { id: session.id });
      
      // 重新加载会话列表
      await loadChatSessions();
      
      // 如果删除的是当前会话，导航到主页
      if (location.pathname === `/chat/${session.id}`) {
        navigate('/');
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  // Cancel delete session
  const cancelDeleteSession = () => {
    setDeleteConfirm({ show: false, session: null });
  };

  return (
    <div className="w-64 h-screen bg-background border-r-2 border-border p-4 flex flex-col">
      <div className="mb-6">
        <Text as="h1" className="text-2xl font-head font-bold">AI Chat</Text>
      </div>

      {/* New Chat Button */}
      <Button
        onClick={createNewChat}
        variant="default"
        className="w-full mb-6 justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {t('chat.newChat')}
      </Button>
      
      {/* Chat Sessions List */}
      <div className="overflow-y-auto flex-grow mb-6">
        <Text as="h2" className="text-sm font-head font-semibold mb-3 text-muted-foreground">{t('nav.chat')}</Text>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="loading-spinner mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <div key={session.id}>
                {editingSessionId === session.id ? (
                  <Card className="p-2 flex items-center">
                    <Input
                      ref={editInputRef}
                      type="text"
                      value={editingSessionName}
                      onChange={(e) => setEditingSessionName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={saveSessionName}
                      className="flex-1 text-sm border-none shadow-none p-1"
                    />
                    <Button
                      onClick={saveSessionName}
                      variant="outline"
                      size="icon"
                      className="ml-2 h-6 w-6 text-green-600 hover:text-green-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </Button>
                  </Card>
                ) : (
                  <Card 
                    className={`transition-all hover:shadow-retro-xs cursor-pointer ${
                      location.pathname === `/chat/${session.id}`
                        ? "bg-primary text-primary-foreground shadow-retro-sm"
                        : "hover:translate-y-0.5"
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault(); // 阻止默认的浏览器右键菜单
                      handleContextMenu(e, session.id);
                    }}
                    onMouseDown={(e) => {
                      // 检测右键点击
                      if (e.button === 2) {
                        e.preventDefault(); // 阻止默认的浏览器右键菜单
                        handleContextMenu(e, session.id);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <NavLink
                        to={`/chat/${session.id}`}
                        className="block px-3 py-2 text-sm flex-1 font-sans"
                      >
                        {session.name}
                      </NavLink>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEditing(session);
                        }}
                        variant="outline"
                        size="icon"
                        className="mr-2 h-6 w-6 border-none shadow-none hover:bg-transparent"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <Card 
          className="fixed z-50 context-menu shadow-retro-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <Button
              variant="outline"
              className="w-full justify-start text-sm border-none shadow-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                const session = chatSessions.find(s => s.id === contextMenu.sessionId);
                if (session) {
                  startEditing(session);
                  setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              {t('common.edit')}
            </Button>
            <Button
              id="delete-session-button"
              variant="destructive"
              className="w-full justify-start text-sm"
              onClick={() => {
                const sessionId = contextMenu.sessionId;
                setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });

                if (!sessionId) {
                  console.error("Session ID is missing");
                  return;
                }

                // 找到会话对象
                const session = chatSessions.find(s => s.id === sessionId);
                if (!session) {
                  console.error("Session not found");
                  return;
                }

                setDeleteConfirm({ show: true, session: session });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t('common.delete')}
            </Button>
          </div>
        </Card>
      )}

      {/* Navigation Links */}
      <div className="border-t-2 border-border pt-4">
        <nav className="space-y-2">
          <NavLink to="/providers">
            {({ isActive }) => (
              <Button
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                </svg>
                {t('nav.providers')}
              </Button>
            )}
          </NavLink>
          <NavLink to="/settings">
            {({ isActive }) => (
              <Button
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('nav.settings')}
              </Button>
            )}
          </NavLink>
          <NavLink to="/about">
            {({ isActive }) => (
              <Button
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                {t('nav.about')}
              </Button>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4 shadow-retro-2xl">
            <Text as="h3" className="text-lg font-head font-semibold mb-4">{t('providers.confirmDelete')}</Text>
            <div className="mb-6">
              <Text className="text-muted-foreground mb-2">
                {t('providers.confirmDeleteProvider', { name: deleteConfirm.session?.name })}
              </Text>
              <Text className="text-destructive text-sm font-medium">{t('providers.cannotUndo')}</Text>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={cancelDeleteSession}
                variant="outline"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={confirmDeleteSession}
                variant="destructive"
              >
                {t('common.confirm')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Main layout component
export default function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
} 