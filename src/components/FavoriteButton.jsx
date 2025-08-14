import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n";

export default function FavoriteButton({ model, onToggle }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(model.is_favorite);
  const { t } = useI18n();

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const newFavoriteStatus = !isFavorite;

    try {
      // Optimistic update
      setIsFavorite(newFavoriteStatus);
      
      // Call backend API
      await invoke("toggle_model_favorite", {
        request: {
          model_id: model.id,
          is_favorite: newFavoriteStatus,
        }
      });

      // Notify parent component
      if (onToggle) {
        onToggle(model.id, newFavoriteStatus);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      // Revert optimistic update on error
      setIsFavorite(isFavorite);
      
      // Show error message (you might want to use a toast notification instead)
      alert(t('favorites.failedError', { error }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        px-2 py-1 text-sm rounded transition-colors duration-200 
        ${isFavorite 
          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={
        isLoading 
          ? t('favorites.updating') 
          : isFavorite 
            ? t('favorites.removeFromFavorites') 
            : t('favorites.addToFavorites')
      }
      aria-label={
        isFavorite 
          ? t('favorites.removeFromFavorites') 
          : t('favorites.addToFavorites')
      }
    >
      {isLoading ? (
        <div className="animate-spin h-3 w-3 border border-current rounded-full border-t-transparent"></div>
      ) : (
        isFavorite ? "−" : "+"
      )}
    </button>
  );
}