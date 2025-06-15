
import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Send, Square, ChevronDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AICodingAssistant from './AICodingAssistant';

interface Task {
  id: string;
  title: string;
  initial_code: string;
  expected_output: string | null;
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
  const editorRef = useRef(null);

  // Update code when task changes
  useEffect(() => {
    if (task) {
      setCode(task.initial_code);
      setLastSubmissionResult(null);
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
    // Simple code execution simulation for preview
    if (language === 'python' && code.includes('print')) {
      const lines = code.split('\n');
      const printLines = lines.filter(line => line.trim().startsWith('print('));
      if (printLines.length > 0) {
        let output = '';
        printLines.forEach(line => {
          const match = line.match(/print\((.*)\)/);
          if (match) {
            const content = match[1].replace(/"/g, '').replace(/'/g, '');
            output += content + '\n';
          }
        });
        return output || 'Code preview...';
      }
    }
    return 'Click "Submit Solution" to validate your code.';
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">No Task Selected</h2>
          <p className="text-gray-400">Please select a task to start coding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Code Editor</h2>
          <span className="text-sm text-gray-400">Task: {task.title}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Language Display */}
          <div className="px-3 py-1 bg-gray-700 text-white text-sm rounded">
            {language}
          </div>

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

      {/* Code Editor */}
      <div className="flex-grow border-b border-gray-700">
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

      {/* Expected Output Section */}
      {task.expected_output && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Expected Output
          </h3>
          <div className="bg-gray-900 rounded p-3 font-mono text-sm text-green-400 border border-gray-600">
            <pre className="whitespace-pre-wrap">{task.expected_output}</pre>
          </div>
        </div>
      )}

      {/* Code Preview/Output Section */}
      <div className="p-4 bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Code Preview
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={runCodePreview}
            className="text-xs bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
          >
            Preview
          </Button>
        </div>
        <div className="bg-black rounded p-3 font-mono text-sm text-blue-400 min-h-[80px] overflow-auto border border-gray-600">
          {runCodePreview()}
        </div>
      </div>

      {/* Submission Feedback */}
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

      {/* AI Coding Assistant */}
      <AICodingAssistant currentCode={code} language={language} />
    </div>
  );
};

export default TaskSubmissionEditor;
