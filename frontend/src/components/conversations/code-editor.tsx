"use client";
import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Play,
  Code2,
  Terminal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompileResult {
  success: boolean;
  output?: string;
  error?: string;
  execution_time?: number;
}

const languages = [
  {
    value: "python",
    label: "Python",
    icon: "🐍",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "javascript",
    label: "JavaScript",
    icon: "🟨",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "java",
    label: "Java",
    icon: "☕",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "cpp",
    label: "C++",
    icon: "⚡",
    color: "bg-purple-100 text-purple-800",
  },
  { value: "c", label: "C", icon: "🔧", color: "bg-gray-100 text-gray-800" },
];

const defaultCode = {
  python: `# Welcome to the Python playground!
print("Hello, World!")

# Try some basic operations
numbers = [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]
print(f"Squared numbers: {squared}")`,

  javascript: `// Welcome to the JavaScript playground!
console.log("Hello, World!");

// Try some modern JS features
const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(x => x * x);
console.log(\`Squared numbers: \${squared}\`);`,

  java: `// Welcome to the Java playground!
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Try some basic operations
        int[] numbers = {1, 2, 3, 4, 5};
        System.out.print("Squared numbers: ");
        for (int num : numbers) {
            System.out.print(num * num + " ");
        }
    }
}`,

  cpp: `// Welcome to the C++ playground!
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, World!" << std::endl;
    
    // Try some basic operations
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    std::cout << "Squared numbers: ";
    for (int num : numbers) {
        std::cout << num * num << " ";
    }
    
    return 0;
}`,

  c: `// Welcome to the C playground!
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    
    // Try some basic operations
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    printf("Squared numbers: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", numbers[i] * numbers[i]);
    }
    
    return 0;
}`,
};

export default function CodeEditor() {
  const [code, setCode] = useState<string>(defaultCode.python);
  const [language, setLanguage] = useState("python");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(defaultCode[newLanguage as keyof typeof defaultCode]);
    setResult(null);
  };

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch("/api/run-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          code,
          language,
          input: input || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: "Network error: Unable to connect to the server",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyOutput = () => {
    const textToCopy = result?.output || result?.error || "";
    navigator.clipboard.writeText(textToCopy);
  };

  const selectedLanguage = languages.find((lang) => lang.value === language);

  return (
    <div className="h-screen">
      <div className="mx-auto max-w-7xl h-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Code Playground
              </h1>
              <p className="text-gray-600">
                Write, compile, and execute code in multiple languages
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
          <div className="lg:col-span-2 space-y-4">
            <Card className="h-full shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Code Editor
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Select
                      value={language}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            <div className="flex items-center gap-2">
                              <span>{lang.icon}</span>
                              {lang.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={runCode}
                      disabled={isRunning || !code?.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white px-6"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Run Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {selectedLanguage && (
                  <Badge className={cn("w-fit", selectedLanguage.color)}>
                    {selectedLanguage.icon} {selectedLanguage.label}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-0 h-[calc(100%-120px)]">
                <div className="border rounded-lg overflow-hidden h-full">
                  <Editor
                    height={500}
                    language={language === "cpp" ? "cpp" : language}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label
                  htmlFor="input"
                  className="text-sm text-gray-600 mb-2 block"
                >
                  Program Input (optional)
                </Label>
                <Textarea
                  id="input"
                  placeholder="Enter input for your program..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </CardContent>
            </Card>

            <Card className="flex-1 shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Output
                  </CardTitle>
                  {result && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyOutput}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="h-[calc(100%-80px)]">
                {!result && !isRunning && (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Click "Run Code" to see output</p>
                    </div>
                  </div>
                )}

                {isRunning && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                      <p className="text-gray-600">Executing code...</p>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="h-full">
                    <Tabs defaultValue="output" className="h-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger
                          value="output"
                          className="flex items-center gap-2"
                        >
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          {result.success ? "Output" : "Error"}
                        </TabsTrigger>
                        <TabsTrigger
                          value="details"
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          Details
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent
                        value="output"
                        className="h-[calc(100%-60px)]"
                      >
                        <ScrollArea className="h-full">
                          <pre
                            className={cn(
                              "text-sm p-4 rounded-lg h-full overflow-auto font-mono whitespace-pre-wrap break-words",
                              result.success
                                ? "bg-green-50 text-green-900 border border-green-200"
                                : "bg-red-50 text-red-900 border border-red-200"
                            )}
                          >
                            {result.success
                              ? result.output || "No output"
                              : result.error || "Unknown error"}
                          </pre>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent
                        value="details"
                        className="h-[calc(100%-60px)]"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Status</span>
                            <Badge
                              variant={
                                result.success ? "default" : "destructive"
                              }
                            >
                              {result.success ? "Success" : "Failed"}
                            </Badge>
                          </div>

                          {result.execution_time !== undefined && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium">
                                Execution Time
                              </span>
                              <span className="text-sm text-gray-600">
                                {result.execution_time}ms
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">
                              Language
                            </span>
                            <span className="text-sm text-gray-600 capitalize">
                              {selectedLanguage?.label}
                            </span>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
