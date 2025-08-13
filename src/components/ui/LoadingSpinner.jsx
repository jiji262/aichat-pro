import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";

export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]} ${className}`}></div>
  );
}

export function LoadingCard({ title = "Loading...", className = "" }) {
  return (
    <Card className={`p-6 text-center ${className}`}>
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <Text className="text-muted-foreground">{title}</Text>
    </Card>
  );
}

export function LoadingPage({ title = "Loading..." }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <Text as="p" className="text-lg font-head font-semibold text-muted-foreground">{title}</Text>
      </div>
    </div>
  );
}