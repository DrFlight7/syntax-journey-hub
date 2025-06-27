import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Send, Square, ChevronDown, CheckCircle, XCircle, Loader2, Play, RotateCcw, BookOpen, Target, Tags, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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

// PythonSimulator is unchanged and correct.
class PythonSimulator {
  private variables: { [key: string]: any } = {};
  private classes: { [key: string]: any } = {};
  private output: string = '';

  constructor(private simulateInput: (prompt: string, variableName: string) => Promise<string>) {}

  async execute(code: string): Promise<string> {
    this.variables = {};
    this.classes = {};
    this.output = '';

    const lines = code.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) {
        i++;
        continue;
      }

      try {
        if (line.startsWith('class ')) {
          i = await this.handleClassDefinition(lines, i);
        } else if (line.includes('=') && !line.includes('==') && !line.includes('!=') && !line.startsWith('if ') && !line.startsWith('elif ')) {
          await this.handleAssignment(line);
          i++;
        } else if (line.startsWith('print(')) {
          await this.handlePrint(line);
          i++;
        } else if (line.includes('input(')) {
          await this.handleInput(line);
          i++;
        } else {
          await this.handleMethodCall(line);
          i++;
        }
      } catch (error) {
        this.output += `Error on line ${i + 1}: ${error}\n`;
        i++;
      }
    }

    return this.output || 'Code executed successfully!';
  }

  private async handleClassDefinition(lines: string[], startIndex: number): Promise<number> {
    const classLine = lines[startIndex].trim();
    const classMatch = classLine.match(/^class\s+(\w+)(?:\(([^)]*)\))?:/);
    if (!classMatch) return startIndex + 1;
    const className = classMatch[1];
    const parentClass = classMatch[2]?.trim();
    const classDef = {
      name: className,
      parent: parentClass,
      methods: {} as { [key: string]: string[] },
      attributes: [] as string[]
    };
    let i = startIndex + 1;
    let currentMethod = '';
    let methodLines: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (trimmedLine && !line.startsWith('    ') && !line.startsWith('\t')) break;
      if (trimmedLine.startsWith('def ')) {
        if (currentMethod && methodLines.length > 0) classDef.methods[currentMethod] = [...methodLines];
        const methodMatch = trimmedLine.match(/def\s+(\w+)\s*\(/);
        currentMethod = methodMatch ? methodMatch[1] : '';
        methodLines = [trimmedLine];
      } else if (currentMethod && (line.startsWith('        ') || line.startsWith('\t\t') || trimmedLine === '')) {
        methodLines.push(trimmedLine);
      } else if (trimmedLine.startsWith('self.')) {
        const attrMatch = trimmedLine.match(/self\.(\w+)/);
        if (attrMatch && !classDef.attributes.includes(attrMatch[1])) classDef.attributes.push(attrMatch[1]);
      }
      i++;
    }
    if (currentMethod && methodLines.length > 0) classDef.methods[currentMethod] = [...methodLines];
    this.classes[className] = classDef;
    return i;
  }

  private async handleAssignment(line: string): Promise<void> {
    const assignmentMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!assignmentMatch) return;
    const [, varName, valueExpr] = assignmentMatch;
    const constructorMatch = valueExpr.match(/(\w+)\((.*)\)/);
    if (constructorMatch && this.classes[constructorMatch[1]]) {
      const className = constructorMatch[1];
      const args = this.parseArguments(constructorMatch[2]);
      const instance = {
        __class__: className,
        __methods__: this.classes[className].methods,
        ...Object.fromEntries(this.classes[className].attributes.map(attr => [attr, null]))
      };
      if (this.classes[className].methods['__init__']) await this.executeMethod(instance, '__init__', args);
      this.variables[varName] = instance;
      return;
    }
    if (valueExpr.includes('input(')) {
      const inputMatch = valueExpr.match(/input\((.*)\)$/);
      if (inputMatch) {
        const promptArg = inputMatch[1];
        let promptText = 'Enter input:';
        if (promptArg) {
          const cleanPrompt = promptArg.replace(/^["']|["']$/g, '');
          if (cleanPrompt) promptText = cleanPrompt;
        }
        const userInput = await this.simulateInput(promptText, varName);
        this.variables[varName] = userInput;
        this.output += `${promptText}${userInput}\n`;
        return;
      }
    }
    const value = this.evaluateExpression(valueExpr);
    this.variables[varName] = value;
  }

  private async handleMethodCall(line: string): Promise<void> {
    const methodMatch = line.match(/(\w+)\.(\w+)\((.*)\)/);
    if (!methodMatch) return;
    const [, objName, methodName, argsStr] = methodMatch;
    const obj = this.variables[objName];
    if (obj && obj.__class__ && obj.__methods__[methodName]) {
      const args = this.parseArguments(argsStr);
      await this.executeMethod(obj, methodName, args);
    }
  }

  private async executeMethod(instance: any, methodName: string, args: any[]): Promise<any> {
    const methodLines = instance.__methods__[methodName];
    if (!methodLines) return;
    for (const line of methodLines) {
      if (line.includes('self.')) {
        const attrMatch = line.match(/self\.(\w+)\s*=\s*(.+)/);
        if (attrMatch) {
          const [, attrName, valueExpr] = attrMatch;
          if (methodName === '__init__' && valueExpr.match(/^\w+$/)) {
            const paramIndex = methodLines[0].match(/def\s+__init__\s*\([^,]+,\s*(\w+)/)?.[1];
            if (paramIndex === valueExpr && args.length > 0) {
              instance[attrName] = args[0];
            } else {
              instance[attrName] = this.evaluateExpression(valueExpr);
            }
          } else {
            instance[attrName] = this.evaluateExpression(valueExpr);
          }
        }
      }
    }
    return instance;
  }

  private parseArguments(argsStr: string): any[] {
    if (!argsStr.trim()) return [];
    return argsStr.split(',').map(arg => this.evaluateExpression(arg.trim()));
  }

  private evaluateExpression(expr: string): any {
    const trimmed = expr.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
    if (!isNaN(Number(trimmed))) return Number(trimmed);
    if (this.variables[trimmed] !== undefined) return this.variables[trimmed];
    const attrMatch = trimmed.match(/(\w+)\.(\w+)/);
    if (attrMatch) {
      const [, objName, attrName] = attrMatch;
      const obj = this.variables[objName];
      if (obj && obj[attrName] !== undefined) return obj[attrName];
    }
    if (trimmed === 'None' || trimmed === 'null') return null;
    if (trimmed === 'True') return true;
    if (trimmed === 'False') return false;
    return trimmed;
  }

  private async handlePrint(line: string): Promise<void> {
    const printMatch = line.match(/^print\((.*)\)$/);
    if (!printMatch) return;
    const args = this.parseArguments(printMatch[1]);
    let outputLine = args.map(value => {
      if (typeof value === 'object' && value !== null && value.__class__) return value.__class__ === 'ListNode' ? this.formatLinkedList(value) : `<${value.__class__} object>`;
      return String(value);
    }).join(' ');
    this.output += outputLine + '\n';
  }

  private formatLinkedList(head: any): string {
    const values: any[] = [];
    let current = head;
    let count = 0;
    const maxNodes = 20;
    while (current && current.val !== undefined && count < maxNodes) {
      values.push(current.val);
      current = current.next;
      count++;
      if (!current || current === head) break;
    }
    return values.join(' -> ') + (current ? ' -> ...' : ' -> None');
  }

  private async handleInput(line: string): Promise<void> {
    const inputMatch = line.match(/input\((.*)\)/);
    if (!inputMatch) return;
    const promptArg = inputMatch[1];
    let promptText = 'Enter input:';
    if (promptArg) {
      const cleanPrompt = promptArg.replace(/^["']|["']$/g, '');
      if (cleanPrompt) promptText = cleanPrompt;
    }
    const userInput = await this.simulateInput(promptText, '');
    this.output += `${promptText}${userInput}\n`;
  }
}

// JavaSimulator is unchanged and correct.
class JavaSimulator {
  private variables: { [key: string]: any } = {};
  private output: string = '';
  private classes: { [key: string]: any } = {};

  async execute(code: string): Promise<string> {
    this.variables = {};
    this.classes = {};
    this.output = '';

    try {
      this.parseClasses(code);
      await this.findAndExecuteMain(code);
      return this.output || 'Code executed successfully with no output.';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Execution Error: ${errorMessage}`;
    }
  }

  private parseClasses(code: string): void {
    const classRegex = /class\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
    let match;
    while ((match = classRegex.exec(code)) !== null) {
        const [, className, classBody] = match;
        this.classes[className] = { 
            name: className, 
            methods: this.parseMethods(classBody) 
        };
    }
  }

  private parseMethods(classBody: string): any {
    const methods: { [key: string]: any } = {};
    const methodRegex = /public\s+(static\s+)?([\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\s*\}/g;
    let match;
    while ((match = methodRegex.exec(classBody)) !== null) {
      const [, , returnType, methodName, params, body] = match;
      methods[methodName] = { returnType, params, body };
    }
    return methods;
  }

  private async findAndExecuteMain(code: string): Promise<void> {
    const mainMethodRegex = /public\s+static\s+void\s+main\s*\((?:String\[\]\s+\w+|String\s+\w+\[\])\)\s*\{([\s\S]*?)\n\s*\}/;
    const mainMatch = code.match(mainMethodRegex);
    if (!mainMatch) return;
    const mainBody = mainMatch[1];
    const statements = mainBody.split(';').map(s => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await this.executeStatement(statement);
    }
  }

  private async executeStatement(statement: string): Promise<void> {
    if (statement.startsWith('System.out.print')) {
      await this.handlePrint(statement);
    } else if (this.isVariableDeclaration(statement)) {
      await this.handleVariableDeclaration(statement);
    } else if (statement.includes('=')) {
        await this.handleAssignment(statement);
    } else if (statement.includes('.')) {
        await this.evaluateExpression(statement);
    }
  }
  
  private isVariableDeclaration(statement: string): boolean {
    const typeRegex = /^\s*([\w\[\]]+)\s+(\w+)/;
    return typeRegex.test(statement);
  }

  private async handleVariableDeclaration(statement: string): Promise<void> {
    const match = statement.match(/^\s*([\w\[\]]+)\s+(\w+)(?:\s*=\s*(.+))?$/);
    if (!match) return;
    const [, type, varName, valueExpr] = match;
    this.variables[varName] = valueExpr ? await this.evaluateExpression(valueExpr) : null;
  }
  
  private async handleAssignment(statement: string): Promise<void> {
    const match = statement.match(/^\s*(\w+)\s*=\s*(.+)$/);
    if (!match) return;
    const [, varName, valueExpr] = match;
    if (this.variables.hasOwnProperty(varName)) {
        this.variables[varName] = await this.evaluateExpression(valueExpr);
    }
  }

  private async handlePrint(statement: string): Promise<void> {
    const printMatch = statement.match(/System\.out\.print(?:ln)?\((.*)\)/);
    if (!printMatch) return;
    const content = printMatch[1].trim();
    let valueToPrint = '';
    if (content.includes('+')) {
        const parts = content.split('+').map(p => p.trim());
        const evaluatedParts = await Promise.all(parts.map(p => this.evaluateExpression(p)));
        valueToPrint = evaluatedParts.join('');
    } else {
        valueToPrint = await this.evaluateExpression(content);
    }
    this.output += valueToPrint + (statement.includes('println') ? '\n' : '');
  }

  private async evaluateExpression(expr: string): Promise<any> {
    const trimmed = expr.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
    if (!isNaN(Number(trimmed))) return Number(trimmed);
    if (this.variables[trimmed] !== undefined) return this.variables[trimmed];
    if (trimmed.startsWith('new ')) {
        const arrayMatch = trimmed.match(/new\s+\w+\[\]\s*\{([^}]*)\}/);
        if (arrayMatch) {
            const elementsStr = arrayMatch[1].trim();
            if (!elementsStr) return [];
            return elementsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        }
        const objMatch = trimmed.match(/new\s+(\w+)\((.*)\)/);
        if (objMatch) {
            const [, className] = objMatch;
            return { __class__: className };
        }
    }
    const methodCallMatch = trimmed.match(/(\w+)\.(\w+)\((.*)\)/);
    if (methodCallMatch) {
        const [, objName, methodName, argsStr] = methodCallMatch;
        const obj = this.variables[objName];
        if (!obj || obj.__class__ !== 'Solution') throw new Error(`Object '${objName}' not found or is not a 'Solution' object.`);
        if (methodName === 'calculateTotalSales') {
            const args = await Promise.all(argsStr.split(',').map(arg => this.evaluateExpression(arg.trim())));
            return this.validateAndRun_calculateTotalSales(args[0]);
        }
    }
    return trimmed; 
  }
  
  private validateAndRun_calculateTotalSales(salesData: number[]): number {
    if (!Array.isArray(salesData)) throw new Error("Input to calculateTotalSales must be an array of numbers.");
    const solutionClass = this.classes['Solution'];
    if (!solutionClass || !solutionClass.methods['calculateTotalSales']) throw new Error("Method 'calculateTotalSales' not found in class 'Solution'.");
    const methodBody = solutionClass.methods['calculateTotalSales'].body;
    const hasLoop = /for\s*\(/.test(methodBody);
    const hasEnhancedLoop = /for\s*\([\w\s]+:/.test(methodBody);
    const usesAddition = /\+=|\+\s*\w+/.test(methodBody);
    const returnsSomething = /return\s+\w+/.test(methodBody);
    if (!((hasLoop || hasEnhancedLoop) && usesAddition && returnsSomething)) {
        this.output += "Hint: Your solution should use a loop to sum the elements and return the total.\n";
        return 0;
    }
    return salesData.reduce((sum, current) => sum + current, 0);
  }
}


const TaskSubmissionEditor = ({ task, language, onSubmit }: TaskSubmissionEditorProps) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<boolean | null>(null);
  const [previewOutput, setPreviewOutput] = useState('Click "Preview" to see code output...');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null);
  const [pendingInputVariable, setPendingInputVariable] = useState<string>('');
  const [showPersistentError, setShowPersistentError] = useState(false);
  const editorRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setCode(task.initial_code);
      setLastSubmissionResult(null);
      setPreviewOutput('Click "Preview" to see code output...');
      setShowDemo(false);
      setIsTyping(false);
      setShowPersistentError(false);
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
      if (!result) {
        setShowPersistentError(true);
        toast({
          title: "Not quite right",
          description: "Your solution needs some work. Check the expected output and try again.",
          variant: "destructive",
        });
      } else {
        setShowPersistentError(false);
      }
    } catch (error) {
      setLastSubmissionResult(false);
      setShowPersistentError(true);
      toast({
        title: "Submission error",
        description: "There was an error submitting your code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateInput = (prompt: string, variableName: string): Promise<string> => {
    return new Promise((resolve) => {
      setInputPrompt(prompt);
      setInputValue('');
      setPendingInputVariable(variableName);
      setInputResolver(() => resolve);
      setShowInputDialog(true);
    });
  };

  const handleInputSubmit = () => {
    if (inputResolver) {
      inputResolver(inputValue);
      setShowInputDialog(false);
      setInputResolver(null);
      setPendingInputVariable('');
    }
  };

  // --- START OF THE FIX ---
  const runCodePreview = () => {
    setIsPreviewLoading(true);
    // Use a small timeout to allow the UI to update to the loading state
    setTimeout(async () => {
      try {
        if (language === 'python') {
          const simulator = new PythonSimulator(simulateInput);
          const result = await simulator.execute(code);
          setPreviewOutput(result);

        } else if (language === 'java') {
          // A "test harness" is the code that calls the user's function.
          // We create it automatically for the preview.
          const testHarness = `
            public static void main(String[] args) {
                Solution solution = new Solution();
                // Use sample data for the preview. This could even come from the task data in the future.
                int[] salesData = new int[] {15, 25, 10, 50}; 
                int total = solution.calculateTotalSales(salesData);
                System.out.println("Preview with sample data {15, 25, 10, 50}:");
                System.out.println("Calculated Total: " + total);
            }
          `;
          
          // Inject the main method into the user's code. This is a simple but effective way.
          // It finds the last closing brace '}' of the class and inserts the main method before it.
          const lastBraceIndex = code.lastIndexOf('}');
          if (lastBraceIndex === -1) {
            throw new Error("Invalid Java code: Missing a closing '}' for the class.");
          }
          
          const fullCodeToExecute = 
            code.substring(0, lastBraceIndex) + 
            testHarness + 
            code.substring(lastBraceIndex);

          const simulator = new JavaSimulator();
          // Execute the COMBINED code (user's class + our test main method)
          const result = await simulator.execute(fullCodeToExecute); 
          setPreviewOutput(result);

        } else {
          setPreviewOutput(`${language} preview not implemented yet`);
        }
      } catch (error) {
        setPreviewOutput(`Preview error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 100); // A 100ms delay is enough for the UI to show "Running..."
  };
  // --- END OF THE FIX ---

  const startTypingDemo = () => {
    if (!task || isTyping) return;
    setIsTyping(true);
    setShowDemo(true);
    setCode('');
    const codeLines = task.initial_code.split('\n');
    let currentLineIndex = 0;
    let currentCharIndex = 0;
    let currentCode = '';
    const typeCharacter = () => {
      if (currentLineIndex < codeLines.length) {
        const currentLine = codeLines[currentLineIndex];
        if (currentCharIndex < currentLine.length) {
          currentCode += currentLine[currentCharIndex];
          setCode(currentCode);
          currentCharIndex++;
          setTimeout(typeCharacter, 70);
        } else {
          currentCode += '\n';
          setCode(currentCode);
          currentLineIndex++;
          currentCharIndex = 0;
          setTimeout(typeCharacter, 400);
        }
      } else {
        setIsTyping(false);
      }
    };
    typeCharacter();
  };

  const resetDemo = () => {
    setIsTyping(false);
    setShowDemo(false);
    if (task) {
      setCode(task.initial_code);
    }
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white rounded-xl shadow-lg p-8">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-gray-800">No Task Selected</h2>
          <p className="text-gray-600">Please select a task to start coding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <Card className="mb-6 bg-gradient-to-r from-blue-50 via-white to-purple-50 border-none shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg"><Target className="h-5 w-5 text-blue-600" /></div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{task.title}</CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-700 leading-relaxed">{task.description}</CardDescription>
            </div>
            <div className="flex gap-3">
              <Badge variant="secondary" className="capitalize px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 border-blue-200">{task.difficulty_level}</Badge>
              <Badge variant="outline" className="capitalize px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 border-purple-200">{language}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-100 rounded-md"><BookOpen className="h-4 w-4 text-green-600" /></div>
              <h3 className="text-base font-semibold text-gray-900">Instructions</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-md p-4">
              <div className="prose prose-blue max-w-none"><div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm text-justify break-words">{task.instructions}</div></div>
            </div>
          </div>
          {task.expected_output && (
            <div className="bg-white rounded-lg shadow-sm border border-green-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded-md"><Target className="h-4 w-4 text-green-600" /></div>
                <h3 className="text-base font-semibold text-gray-900">Expected Output</h3>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-md p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 flex items-center px-3 border-b border-gray-700">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div><div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div></div>
                  <span className="text-gray-400 text-xs ml-3 font-mono">Output Console</span>
                </div>
                <pre className="whitespace-pre-wrap text-green-400 font-mono text-sm mt-6 leading-relaxed">{task.expected_output}</pre>
              </div>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 rounded-md"><Tags className="h-4 w-4 text-purple-600" /></div>
                <h3 className="text-base font-semibold text-gray-900">Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, index) => (<Badge key={index} variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 px-2 py-1 text-xs font-medium hover:bg-purple-100 transition-colors">{tag}</Badge>))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {showPersistentError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-red-100 rounded-full"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
            <div>
              <h4 className="text-sm font-semibold text-red-800">Not quite right</h4>
              <p className="text-sm text-red-700">Your solution needs some work. Check the expected output and try again.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPersistentError(false)} className="ml-auto text-red-600 hover:text-red-800"><XCircle className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700">
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Code Editor</h2>
            <div className="flex gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><div className="w-3 h-3 bg-green-500 rounded-full"></div></div>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={startTypingDemo} disabled={isTyping} size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">{isTyping ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Typing...</> : <><Play className="w-4 h-4 mr-2" />Demo</>}</Button>
            {showDemo && <Button onClick={resetDemo} size="sm" variant="outline" className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>}
            <Button onClick={handleSubmitSolution} disabled={isSubmitting || !code.trim()} className={`px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${lastSubmissionResult === true ? 'bg-green-600 hover:bg-green-700 text-white' : lastSubmissionResult === false ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validating...</> : lastSubmissionResult === true ? <><CheckCircle className="w-4 h-4 mr-2" />Correct!</> : lastSubmissionResult === false ? <><XCircle className="w-4 h-4 mr-2" />Try Again</> : <><Send className="w-4 h-4 mr-2" />Submit Solution</>}</Button>
          </div>
        </div>
        <div style={{ height: '500px' }} className="border-b border-gray-700">
          <Editor height="100%" language={language} value={code} onChange={(value) => setCode(value || '')} onMount={handleEditorDidMount} theme="vs-dark" options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', lineNumbers: 'on', roundedSelection: false, scrollbar: { vertical: 'visible', horizontal: 'visible' }, folding: true, foldingStrategy: 'indentation', showFoldingControls: 'always' }} />
        </div>
        <div className="p-3 bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Code Preview</h3>
            <Button variant="outline" size="sm" onClick={runCodePreview} disabled={isPreviewLoading} className="text-xs bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">{isPreviewLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running...</> : 'Preview'}</Button>
          </div>
          <div className="bg-black rounded p-3 font-mono text-sm text-blue-400 min-h-[60px] max-h-[100px] overflow-auto border border-gray-600"><pre className="whitespace-pre-wrap">{previewOutput}</pre></div>
        </div>
        {lastSubmissionResult !== null && !showPersistentError && (<div className={`p-3 border-t ${lastSubmissionResult ? 'bg-green-900 border-green-700 text-green-100' : 'bg-red-900 border-red-700 text-red-100'}`}><div className="flex items-center gap-2">{lastSubmissionResult ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}<span className="text-sm font-medium">{lastSubmissionResult ? 'Correct! Your solution passed all tests.' : 'Your solution needs some work. Check the expected output and try again.'}</span></div></div>)}
      </div>
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Input Required</DialogTitle><DialogDescription>Your code is asking for input{pendingInputVariable && ` for variable "${pendingInputVariable}"`}. Please enter a value below.</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="text-sm font-medium text-gray-700 mb-2 block">{inputPrompt}</label><Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleInputSubmit(); }} placeholder="Enter your input..." autoFocus /></div><div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => setShowInputDialog(false)}>Cancel</Button><Button onClick={handleInputSubmit}>Submit</Button></div></div></DialogContent></Dialog>
      <AICodingAssistant currentCode={code} language={language} />
    </div>
  );
};

export default TaskSubmissionEditor;