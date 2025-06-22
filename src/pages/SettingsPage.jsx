import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n/index.jsx";

export default function SettingsPage() {
  const { t, language, changeLanguage } = useI18n();
  const [theme, setTheme] = useState("system");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const themeSetting = await invoke("get_setting", { key: "theme" });
        if (themeSetting) {
          setTheme(themeSetting);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Handle theme change
  const handleThemeChange = async (newTheme) => {
    try {
      setIsSaving(true);
      
      // Save to backend
      await invoke("set_setting", {
        setting: {
          key: "theme",
          value: newTheme
        }
      });
      
      // Update state
      setTheme(newTheme);
      
      // Apply theme
      applyTheme(newTheme);
    } catch (error) {
      console.error("Failed to save theme setting:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Apply theme to document
  const applyTheme = (newTheme) => {
    if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('settings.appearance')}</h2>

          {/* Language Setting */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.language')}
            </label>
            <div className="flex space-x-4">
              <LanguageButton
                language="en"
                currentLanguage={language}
                onClick={() => changeLanguage("en")}
                disabled={isSaving}
                title={t('settings.languageEn')}
              />
              <LanguageButton
                language="zh"
                currentLanguage={language}
                onClick={() => changeLanguage("zh")}
                disabled={isSaving}
                title={t('settings.languageZh')}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.theme')}
            </label>
            <div className="flex space-x-4">
              <ThemeButton
                theme="light"
                currentTheme={theme}
                onClick={() => handleThemeChange("light")}
                disabled={isSaving}
                title={t('settings.themeLight')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                }
              />

              <ThemeButton
                theme="dark"
                currentTheme={theme}
                onClick={() => handleThemeChange("dark")}
                disabled={isSaving}
                title={t('settings.themeDark')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                }
              />

              <ThemeButton
                theme="system"
                currentTheme={theme}
                onClick={() => handleThemeChange("system")}
                disabled={isSaving}
                title={t('settings.themeSystem')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                  </svg>
                }
              />
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">About Data Storage</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              All data is stored locally on your device. Chat messages, provider configurations, and settings 
              are saved in a local database file. API keys are securely stored in your system's keychain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Theme option button component
function ThemeButton({ theme, currentTheme, onClick, disabled, icon, title }) {
  const isActive = currentTheme === theme;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center p-3 rounded-md transition ${
        isActive
          ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {icon}
      <span className="mt-1 text-sm">{title}</span>
    </button>
  );
}

// Language option button component
function LanguageButton({ language, currentLanguage, onClick, disabled, title }) {
  const isActive = currentLanguage === language;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center p-3 rounded-md transition ${
        isActive
          ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center text-lg font-semibold">
        {language === 'en' ? '🇺🇸' : '🇨🇳'}
      </div>
      <span className="mt-1 text-sm">{title}</span>
    </button>
  );
}