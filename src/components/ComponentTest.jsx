import React from 'react';
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Input } from "@/components/retroui/Input";
import { Textarea } from "@/components/retroui/Textarea";
import { Select } from "@/components/retroui/Select";

export default function ComponentTest() {
  return (
    <div className="p-6">
      <Text as="h1" className="text-2xl font-head font-bold mb-6">Component Test</Text>
      
      <Card className="p-4 mb-4">
        <Text as="h2" className="text-lg font-head font-semibold mb-4">All Components Working</Text>
        
        <div className="space-y-4">
          <Button variant="default">Test Button</Button>
          
          <Input placeholder="Test Input" />
          
          <Textarea placeholder="Test Textarea" />
          
          <Select.Root>
            <Select.Trigger>
              <Select.Value placeholder="Test Select" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="test">Test Option</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </Card>
    </div>
  );
}