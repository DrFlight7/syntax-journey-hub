import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Square, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import AICodingAssistant from './AICodingAssistant';

interface InteractiveCodeEditorProps {
  initialCode: string;
}

const InteractiveCodeEditor = ({ initialCode }: InteractiveCodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');

    try {
      // Make API call to JDoodle via our Supabase edge function
      const { data: result, error } = await supabase.functions.invoke('execute-code', {
        body: {
          code,
          language,
          input: '' // Could be extended to support input later
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (result.error) {
        setOutput(`Error: ${result.error}${result.details ? ` - ${result.details}` : ''}`);
      } else {
        const output = result.output || 'Code executed successfully! (No output)';
        const executionInfo = result.memory && result.cpuTime 
          ? `\n\n--- Execution Info ---\nMemory: ${result.memory}\nCPU Time: ${result.cpuTime}`
          : '';
        setOutput(output + executionInfo);
      }
    } catch (error) {
      console.error('Code execution error:', error);
      setOutput(`Execution Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Editor Header */}
      <div className="flex items-center justify-between mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-white">Code Editor</h2>
        
        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="java">Java</SelectItem>
            </SelectContent>
          </Select>

          {/* Run Button */}
          <Button
            onClick={handleRunCode}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Code
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-grow border border-gray-700 rounded-lg overflow-hidden mb-4">
        <Editor
          height="400px"
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
          }}
        />
      </div>

      {/* Output Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 min-h-[120px]">
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Output
          </h3>
        </div>
        <div className="bg-black rounded p-3 font-mono text-sm text-green-400 min-h-[80px] overflow-auto">
          {output || 'Click "Run Code" to see output here...'}
        </div>
      </div>

      {/* AI Coding Assistant */}
      <AICodingAssistant currentCode={code} language={language} />
    </div>
  );
};

export default InteractiveCodeEditor;
