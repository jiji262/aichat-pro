import { useState } from "react";
import { 
  Button, 
  Card, 
  Text, 
  Input, 
  Textarea, 
  Select,
  LoadingSpinner,
  ErrorMessage,
  SuccessMessage,
  WarningMessage,
  EmptyState
} from "@/components/ui";

export default function RetroUITest() {
  const [inputValue, setInputValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");
  const [selectValue, setSelectValue] = useState(undefined);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <Text as="h1" className="text-3xl font-head font-bold">RetroUI Component Test</Text>
      
      {/* Typography Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Typography</Text>
        <div className="space-y-2">
          <Text as="h1">Heading 1 - Archivo Black</Text>
          <Text as="h2">Heading 2 - Archivo Black</Text>
          <Text as="h3">Heading 3 - Archivo Black</Text>
          <Text as="p">Body text - Space Grotesk</Text>
          <Text as="a" href="#" className="retro-link">Link with RetroUI styling</Text>
        </div>
      </Card>

      {/* Button Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Buttons</Text>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="default" size="sm">Small Button</Button>
          <Button variant="default" size="lg">Large Button</Button>
          <Button variant="default" size="icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Button>
        </div>
      </Card>

      {/* Form Components Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Form Components</Text>
        <div className="space-y-4">
          <div>
            <Text className="block text-sm font-medium mb-2">Input Field</Text>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type something..."
              className="w-full"
            />
          </div>
          
          <div>
            <Text className="block text-sm font-medium mb-2">Textarea</Text>
            <Textarea
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              placeholder="Type a longer message..."
              className="w-full"
            />
          </div>
          
          <div>
            <Text className="block text-sm font-medium mb-2">Select Dropdown</Text>
            <Select.Root value={selectValue} onValueChange={setSelectValue}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Choose an option..." />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="option1">Option 1</Select.Item>
                <Select.Item value="option2">Option 2</Select.Item>
                <Select.Item value="option3">Option 3</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </Card>

      {/* Loading States Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Loading States</Text>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
            <LoadingSpinner size="xl" />
          </div>
        </div>
      </Card>

      {/* Message States Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Message States</Text>
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button variant="destructive" size="sm" onClick={() => setShowError(!showError)}>
              Toggle Error
            </Button>
            <Button variant="default" size="sm" onClick={() => setShowSuccess(!showSuccess)}>
              Toggle Success
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowWarning(!showWarning)}>
              Toggle Warning
            </Button>
          </div>
          
          {showError && (
            <ErrorMessage
              title="Error Occurred"
              message="This is an example error message with RetroUI styling."
              onRetry={() => setShowError(false)}
              retryText="Dismiss"
            />
          )}
          
          {showSuccess && (
            <SuccessMessage
              title="Success!"
              message="This is an example success message with RetroUI styling."
              onDismiss={() => setShowSuccess(false)}
              dismissText="Great!"
            />
          )}
          
          {showWarning && (
            <WarningMessage
              title="Warning"
              message="This is an example warning message with RetroUI styling."
              onAction={() => setShowWarning(false)}
              actionText="Got it"
            />
          )}
        </div>
      </Card>

      {/* Empty State Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Empty State</Text>
        <EmptyState
          title="No Items Found"
          description="This is an example empty state with RetroUI styling. It shows when there's no data to display."
          action={() => alert("Action clicked!")}
          actionText="Add Item"
        />
      </Card>

      {/* Theme Test */}
      <Card className="p-6">
        <Text as="h2" className="text-2xl font-head font-bold mb-4">Theme Colors</Text>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-primary text-primary-foreground border-2 border-border shadow-retro-sm">
            <Text className="font-head font-bold">Primary</Text>
          </div>
          <div className="p-4 bg-secondary text-secondary-foreground border-2 border-border shadow-retro-sm">
            <Text className="font-head font-bold">Secondary</Text>
          </div>
          <div className="p-4 bg-accent text-accent-foreground border-2 border-border shadow-retro-sm">
            <Text className="font-head font-bold">Accent</Text>
          </div>
          <div className="p-4 bg-destructive text-destructive-foreground border-2 border-border shadow-retro-sm">
            <Text className="font-head font-bold">Destructive</Text>
          </div>
        </div>
      </Card>
    </div>
  );
}