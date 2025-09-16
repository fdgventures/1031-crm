"use client";

import React, { useState } from "react";
import { Button, Input, Accordion } from "@/components/ui";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  const accordionItems = [
    {
      id: "1",
      title: "Exchange Information",
      content: (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This section contains information about the 1031 exchange.
          </p>
          <div className="text-xs text-gray-500">
            • Property details
            <br />
            • Transaction timeline
            <br />• Participant information
          </div>
        </div>
      ),
    },
    {
      id: "2",
      title: "Participant Details",
      content: (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Participant information and contact details.
          </p>
          <div className="text-xs text-gray-500">
            • Name and contact info
            <br />
            • Business information
            <br />• Exchange requirements
          </div>
        </div>
      ),
    },
    {
      id: "3",
      title: "Documentation",
      content: (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Required documents and forms for the exchange.
          </p>
          <div className="text-xs text-gray-500">
            • Legal documents
            <br />
            • Financial statements
            <br />• Property appraisals
          </div>
        </div>
      ),
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.length < 3 && e.target.value.length > 0) {
      setInputError("Minimum 3 characters required");
    } else {
      setInputError("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            1031 Exchange CRM
          </h1>
          <p className="text-lg text-gray-600 text-center">
            Welcome to the 1031 Exchange CRM system
          </p>
        </div>

        {/* Button Components Demo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Button Components
          </h2>

          <div className="space-y-6">
            {/* Button Variants */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                Variants
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="small">Small</Button>
                <Button size="medium">Medium</Button>
                <Button size="large">Large</Button>
              </div>
            </div>

            {/* Button States */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">States</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Normal</Button>
                <Button disabled>Disabled</Button>
                <Button type="submit">Submit Type</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Input Components Demo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Input Components
          </h2>

          <div className="space-y-6">
            {/* Basic Inputs */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                Basic Inputs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  helperText="We'll never share your email"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Input Sizes */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Sizes</h3>
              <div className="space-y-3">
                <Input
                  label="Small Input"
                  size="small"
                  placeholder="Small size input"
                />
                <Input
                  label="Medium Input"
                  size="medium"
                  placeholder="Medium size input"
                />
                <Input
                  label="Large Input"
                  size="large"
                  placeholder="Large size input"
                />
              </div>
            </div>

            {/* Input with Error */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                With Error
              </h3>
              <Input
                label="Test Input"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type something..."
                error={inputError}
                helperText="This input validates minimum length"
              />
            </div>

            {/* Disabled Input */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                Disabled
              </h3>
              <Input
                label="Disabled Input"
                placeholder="This input is disabled"
                disabled
                value="Disabled value"
              />
            </div>
          </div>
        </div>

        {/* Accordion Component Demo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Accordion Component
          </h2>

          <div className="space-y-6">
            {/* Single Open Accordion */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                Single Open (Default)
              </h3>
              <Accordion items={accordionItems} />
            </div>

            {/* Multiple Open Accordion */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                Multiple Open
              </h3>
              <Accordion
                items={accordionItems}
                allowMultiple={true}
                defaultOpenItems={["1"]}
              />
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Usage Examples
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Form Example</h3>
              <div className="space-y-3">
                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  required
                />
                <Input label="Company" placeholder="Enter company name" />
                <div className="flex gap-3">
                  <Button variant="primary">Save</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">
                Interactive Example
              </h3>
              <p className="text-sm text-green-700 mb-3">
                Try typing in the input above to see error validation, or click
                accordion items to see animations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
