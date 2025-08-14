import { useState, useEffect } from "react";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { useI18n } from "@/i18n";

export default function AboutPage() {
  const [appVersion, setAppVersion] = useState("1.0.0");
  const { t } = useI18n();
  
  const openLink = (url) => {
    window.open(url, '_blank');
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Text as="h1" className="text-2xl font-head font-bold mb-6">{t('about.title')}</Text>
      
      <Card className="p-6 mb-6 shadow-retro-md">
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <Text as="h2" className="text-3xl font-head font-bold mb-2">{t('about.appName')}</Text>
            <Text className="text-muted-foreground">{t('about.version', { appVersion })}</Text>
          </div>
        </div>
        
        <Text className="mb-8 leading-relaxed">
          {t('about.description')}
        </Text>
        
        <div className="mb-8">
          <Text as="h3" className="text-lg font-head font-medium mb-4">{t('about.features')}</Text>
          <Card className="p-4 bg-accent/20 border-accent">
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <Text>Multiple AI provider support (OpenAI, Gemini, DeepSeek, Grok)</Text>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <Text>Local-first data storage for privacy</Text>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <Text>Custom assistants with specialized system prompts</Text>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <Text>Full markdown rendering with syntax highlighting</Text>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <Text>Cross-platform (Windows and macOS)</Text>
              </li>
            </ul>
          </Card>
        </div>
        
        <div className="mb-8">
          <Text as="h3" className="text-lg font-head font-medium mb-4">{t('about.builtWith')}</Text>
          <Card className="p-4 bg-secondary/10 border-secondary">
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <div>
                  <Text 
                    as="a" 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); openLink("https://tauri.app") }}
                    className="text-primary hover:text-primary-hover font-medium underline decoration-2 underline-offset-2"
                  >
                    Tauri
                  </Text>
                  <Text> - A framework for building lightweight desktop applications</Text>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <div>
                  <Text 
                    as="a" 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); openLink("https://react.dev") }}
                    className="text-primary hover:text-primary-hover font-medium underline decoration-2 underline-offset-2"
                  >
                    React
                  </Text>
                  <Text> - A JavaScript library for building user interfaces</Text>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 font-bold">•</span>
                <div>
                  <Text 
                    as="a" 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); openLink("https://www.rust-lang.org") }}
                    className="text-primary hover:text-primary-hover font-medium underline decoration-2 underline-offset-2"
                  >
                    Rust
                  </Text>
                  <Text> - A language empowering everyone to build reliable and efficient software</Text>
                </div>
              </li>
            </ul>
          </Card>
        </div>
        
        <div className="border-t-2 border-border pt-6">
          <Text as="h3" className="text-lg font-head font-medium mb-3">{t('about.license')}</Text>
          <Text className="text-muted-foreground">
            {t('about.licenseText')}
          </Text>
        </div>
      </Card>
    </div>
  );
} 