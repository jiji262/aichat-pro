import { useState, useEffect } from "react";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { I18nProvider } from "./i18n/index.jsx";
import "./styles.css";

// Import pages
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import ProvidersPage from "./pages/ProvidersPage";

import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";

// Create router (HashRouter is safer for Tauri packaged apps)
const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <ChatPage />,
      },
      {
        path: "/chat/:sessionId?",
        element: <ChatPage />,
      },
      {
        path: "/providers",
        element: <ProvidersPage />,
      },

      {
        path: "/settings",
        element: <SettingsPage />,
      },
      {
        path: "/about",
        element: <AboutPage />,
      },
    ],
  },
]);

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("system");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  // Load theme from settings
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const themeSetting = await invoke("get_setting", { key: "theme" });
        if (themeSetting) {
          setTheme(themeSetting);
          applyTheme(themeSetting);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Apply theme to document
  const applyTheme = (newTheme) => {
    if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };
  
  // Listen for system theme changes
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

export default App;
