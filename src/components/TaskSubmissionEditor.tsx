
import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Send, Square, ChevronDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AICodingAssistant from './AICodingAssistant';

interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string;
  initial_code: string;
  expected_output: string | null;
  difficulty_level: string;
  tags: string[];
}

interface TaskSubmissionEditorProps {
  task: Task | null;
  language: string;
  onSubmit: (code: string) => Promise<boolean>;
}

const TaskSubmissionEditor = ({ task, language, onSubmit }: TaskSubmissionEditorProps) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<boolean | null>(null);
  const [previewOutput, setPreviewOutput] = useState('Click "Preview" to see code output...');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const editorRef = useRef(null);

  // Update code when task changes
  useEffect(() => {
    if (task) {
      setCode(task.initial_code);
      setLastSubmissionResult(null);
      setPreviewOutput('Click "Preview" to see code output...');
    }
  }, [task?.id]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleSubmitSolution = async () => {
    if (!task || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit(code);
      setLastSubmissionResult(result);
    } catch (error) {
      console.error('Submission error:', error);
      setLastSubmissionResult(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runCodePreview = () => {
    setIsPreviewLoading(true);
    
    setTimeout(() => {
      try {
        if (language === 'python') {
          // Enhanced Python simulation
          const lines = code.split('\n');
          let output = '';
          let variables: { [key: string]: any } = {};
          
          // Process each line
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip comments and empty lines
            if (trimmedLine.startsWith('#') || !trimmedLine) continue;
            
            // Handle variable assignments
            const assignmentMatch = trimmedLine.match(/^(\w+)\s*=\s*(.+)$/);
            if (assignmentMatch) {
              const [, varName, value] = assignmentMatch;
              try {
                // Simple value parsing - store the actual value without quotes
                if (value.startsWith('"') && value.endsWith('"')) {
                  variables[varName] = value.slice(1, -1); // Remove quotes
                } else if (value.startsWith("'") && value.endsWith("'")) {
                  variables[varName] = value.slice(1, -1); // Remove quotes
                } else if (!isNaN(Number(value))) {
                  variables[varName] = Number(value);
                } else {
                  variables[varName] = value;
                }
              } catch (e) {
                variables[varName] = value;
              }
              continue;
            }
            
            // Handle print statements
            const printMatch = trimmedLine.match(/^print\((.*)\)$/);
            if (printMatch) {
              const printContent = printMatch[1];
              let outputLine = '';
              
              // Split by comma but be careful with quoted strings
              const args: string[] = [];
              let currentArg = '';
              let inQuotes = false;
              let quoteChar = '';
              
              for (let i = 0; i < printContent.length; i++) {
                const char = printContent[i];
                
                if ((char === '"' || char === "'") && !inQuotes) {
                  inQuotes = true;
                  quoteChar = char;
                  currentArg += char;
                } else if (char === quoteChar && inQuotes) {
                  inQuotes = false;
                  quoteChar = '';
                  currentArg += char;
                } else if (char === ',' && !inQuotes) {
                  args.push(currentArg.trim());
                  currentArg = '';
                } else {
                  currentArg += char;
                }
              }
              
              // Add the last argument
              if (currentArg.trim()) {
                args.push(currentArg.trim());
              }
              
              // Process each argument
              for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                
                if (arg.startsWith('"') && arg.endsWith('"')) {
                  // String literal - remove quotes for output
                  outputLine += arg.slice(1, -1);
                } else if (arg.startsWith("'") && arg.endsWith("'")) {
                  // String literal - remove quotes for output
                  outputLine += arg.slice(1, -1);
                } else if (variables[arg] !== undefined) {
                  // Variable - use stored value (already without quotes)
                  outputLine += variables[arg];
                } else if (!isNaN(Number(arg))) {
                  // Number
                  outputLine += arg;
                } else {
                  // Unknown, keep as is
                  outputLine += arg;
                }
                
                // Add space between arguments (Python print default)
                if (i < args.length - 1) {
                  outputLine += ' ';
                }
              }
              
              output += outputLine + '\n';
            }
          }
          
          setPreviewOutput(output || 'No output generated');
        } else {
          setPreviewOutput(`${language} preview not implemented yet`);
        }
      } catch (error) {
        setPreviewOutput(`Preview error: ${error}`);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 500);
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2 text-gray-800">No Task Selected</h2>
          <p className="text-gray-600">Please select a task to start coding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Task Information Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{task.title}</CardTitle>
              <CardDescription className="mt-2 text-gray-700 leading-relaxed">
                {task.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">
                {task.difficulty_level}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {language}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
              </div>
            </div>

            {task.expected_output && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Expected Output</h3>
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 font-mono text-sm">
                  <pre className="whitespace-pre-wrap text-gray-800">{task.expected_output}</pre>
                </div>
              </div>
            )}

            {task.tags && task.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-purple-700 border-purple-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Code Editor Section */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">Code Editor</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Submit Button */}
            <Button
              onClick={handleSubmitSolution}
              disabled={isSubmitting || !code.trim()}
              className={`px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${
                lastSubmissionResult === true
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : lastSubmissionResult === false
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : lastSubmissionResult === true ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Correct!
                </>
              ) : lastSubmissionResult === false ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Try Again
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Solution
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Code Editor - Give it more height */}
        <div style={{ height: '400px' }} className="border-b border-gray-700">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
              },
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
            }}
          />
        </div>

        {/* Code Preview/Output Section - Make it more compact */}
        <div className="p-4 bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Code Preview
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={runCodePreview}
              disabled={isPreviewLoading}
              className="text-xs bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Running...
                </>
              ) : (
                'Preview'
              )}
            </Button>
          </div>
          <div className="bg-black rounded p-3 font-mono text-sm text-blue-400 min-h-[60px] max-h-[120px] overflow-auto border border-gray-600">
            <pre className="whitespace-pre-wrap">{previewOutput}</pre>
          </div>
        </div>

        {/* Submission Feedback - Make it more compact */}
        {lastSubmissionResult !== null && (
          <div className={`p-3 border-t ${
            lastSubmissionResult 
              ? 'bg-green-900 border-green-700 text-green-100' 
              : 'bg-red-900 border-red-700 text-red-100'
          }`}>
            <div className="flex items-center gap-2">
              {lastSubmissionResult ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {lastSubmissionResult 
                  ? 'Correct! Your solution passed all tests.' 
                  : 'Your solution needs some work. Check the expected output and try again.'
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* AI Coding Assistant */}
      <AICodingAssistant currentCode={code} language={language} />
    </div>
  );
};

export default TaskSubmissionEditor;
