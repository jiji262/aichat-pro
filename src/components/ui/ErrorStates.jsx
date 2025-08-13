import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";

export function ErrorMessage({ 
  title = "Error", 
  message, 
  onRetry, 
  retryText = "Try Again",
  className = "" 
}) {
  return (
    <Card className={`p-6 border-destructive bg-destructive/10 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-destructive">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-6.75 1.5.75-.75a3 3 0 105.25.25l-.75.75m-.75.75h7.5m-7.5 0l.75-.75a3 3 0 105.25.25l-.75.75m-.75.75v3.75m0-3.75h7.5m-7.5 0l.75-.75a3 3 0 105.25.25l-.75.75" />
          </svg>
        </div>
        <div className="flex-1">
          <Text as="h3" className="font-head font-semibold text-destructive mb-2">{title}</Text>
          {message && <Text className="text-muted-foreground mb-4">{message}</Text>}
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="destructive" 
              size="sm"
            >
              {retryText}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function SuccessMessage({ 
  title = "Success", 
  message, 
  onDismiss,
  dismissText = "OK",
  className = "" 
}) {
  return (
    <Card className={`p-6 border-green-600 bg-green-50 dark:bg-green-900/20 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <Text as="h3" className="font-head font-semibold text-green-600 mb-2">{title}</Text>
          {message && <Text className="text-muted-foreground mb-4">{message}</Text>}
          {onDismiss && (
            <Button 
              onClick={onDismiss} 
              variant="outline" 
              size="sm"
              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
            >
              {dismissText}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function WarningMessage({ 
  title = "Warning", 
  message, 
  onAction,
  actionText = "Continue",
  className = "" 
}) {
  return (
    <Card className={`p-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-yellow-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1">
          <Text as="h3" className="font-head font-semibold text-yellow-600 mb-2">{title}</Text>
          {message && <Text className="text-muted-foreground mb-4">{message}</Text>}
          {onAction && (
            <Button 
              onClick={onAction} 
              variant="outline" 
              size="sm"
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white"
            >
              {actionText}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ 
  title = "No data", 
  description, 
  action,
  actionText = "Get Started",
  icon,
  className = "" 
}) {
  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-muted-foreground">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mb-4">
        {icon || defaultIcon}
      </div>
      <Text as="h3" className="text-lg font-head font-semibold mb-2">{title}</Text>
      {description && <Text className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</Text>}
      {action && (
        <Button onClick={action} variant="default">
          {actionText}
        </Button>
      )}
    </div>
  );
}