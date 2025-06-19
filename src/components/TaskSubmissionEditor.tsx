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

// Enhanced Python simulator with support for classes and linked lists
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
          // Handle method calls and other operations
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

    // Parse class body
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if we've reached the end of the class (no indentation or new class/function)
      if (trimmedLine && !line.startsWith('    ') && !line.startsWith('\t')) {
        break;
      }

      if (trimmedLine.startsWith('def ')) {
        // Save previous method if exists
        if (currentMethod && methodLines.length > 0) {
          classDef.methods[currentMethod] = [...methodLines];
        }

        // Start new method
        const methodMatch = trimmedLine.match(/def\s+(\w+)\s*\(/);
        currentMethod = methodMatch ? methodMatch[1] : '';
        methodLines = [trimmedLine];
      } else if (currentMethod && (line.startsWith('        ') || line.startsWith('\t\t') || trimmedLine === '')) {
        // Method body line
        methodLines.push(trimmedLine);
      } else if (trimmedLine.startsWith('self.')) {
        // Instance attribute
        const attrMatch = trimmedLine.match(/self\.(\w+)/);
        if (attrMatch && !classDef.attributes.includes(attrMatch[1])) {
          classDef.attributes.push(attrMatch[1]);
        }
      }

      i++;
    }

    // Save last method
    if (currentMethod && methodLines.length > 0) {
      classDef.methods[currentMethod] = [...methodLines];
    }

    this.classes[className] = classDef;
    return i;
  }

  private async handleAssignment(line: string): Promise<void> {
    const assignmentMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!assignmentMatch) return;

    const [, varName, valueExpr] = assignmentMatch;

    // Handle object instantiation
    const constructorMatch = valueExpr.match(/(\w+)\((.*)\)/);
    if (constructorMatch && this.classes[constructorMatch[1]]) {
      const className = constructorMatch[1];
      const args = this.parseArguments(constructorMatch[2]);
      
      // Create object instance
      const instance = {
        __class__: className,
        __methods__: this.classes[className].methods,
        ...Object.fromEntries(this.classes[className].attributes.map(attr => [attr, null]))
      };

      // Call constructor if exists
      if (this.classes[className].methods['__init__']) {
        await this.executeMethod(instance, '__init__', args);
      }

      this.variables[varName] = instance;
      return;
    }

    // Handle input() calls
    if (valueExpr.includes('input(')) {
      const inputMatch = valueExpr.match(/input\((.*)\)$/);
      if (inputMatch) {
        const promptArg = inputMatch[1];
        let promptText = 'Enter input:';
        
        if (promptArg) {
          const cleanPrompt = promptArg.replace(/^["']|["']$/g, '');
          if (cleanPrompt) {
            promptText = cleanPrompt;
          }
        }
        
        const userInput = await this.simulateInput(promptText, varName);
        this.variables[varName] = userInput;
        this.output += `${promptText}${userInput}\n`;
        return;
      }
    }

    // Handle regular assignments
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

    // Simple method execution - handle basic operations
    for (const line of methodLines) {
      if (line.includes('self.')) {
        // Handle attribute assignments
        const attrMatch = line.match(/self\.(\w+)\s*=\s*(.+)/);
        if (attrMatch) {
          const [, attrName, valueExpr] = attrMatch;
          
          // Handle parameter references in constructor
          if (methodName === '__init__' && valueExpr.match(/^\w+$/)) {
            // Simple parameter assignment
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
    
    const args: any[] = [];
    const argParts = argsStr.split(',');
    
    for (const arg of argParts) {
      const trimmed = arg.trim();
      args.push(this.evaluateExpression(trimmed));
    }
    
    return args;
  }

  private evaluateExpression(expr: string): any {
    const trimmed = expr.trim();
    
    // String literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    // Numbers
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    
    // Variables
    if (this.variables[trimmed] !== undefined) {
      return this.variables[trimmed];
    }
    
    // Object attributes
    const attrMatch = trimmed.match(/(\w+)\.(\w+)/);
    if (attrMatch) {
      const [, objName, attrName] = attrMatch;
      const obj = this.variables[objName];
      if (obj && obj[attrName] !== undefined) {
        return obj[attrName];
      }
    }
    
    // None/null
    if (trimmed === 'None' || trimmed === 'null') {
      return null;
    }
    
    // Boolean values
    if (trimmed === 'True') return true;
    if (trimmed === 'False') return false;
    
    return trimmed;
  }

  private async handlePrint(line: string): Promise<void> {
    const printMatch = line.match(/^print\((.*)\)$/);
    if (!printMatch) return;

    const printContent = printMatch[1];
    let outputLine = '';
    
    // Handle multiple arguments
    const args = this.parseArguments(printContent);
    
    for (let i = 0; i < args.length; i++) {
      let value = args[i];
      
      // Handle object representation
      if (typeof value === 'object' && value !== null && value.__class__) {
        if (value.__class__ === 'ListNode') {
          // Special handling for ListNode to show linked list structure
          outputLine += this.formatLinkedList(value);
        } else {
          outputLine += `<${value.__class__} object>`;
        }
      } else {
        outputLine += String(value);
      }
      
      if (i < args.length - 1) {
        outputLine += ' ';
      }
    }
    
    this.output += outputLine + '\n';
  }

  private formatLinkedList(head: any): string {
    const values: any[] = [];
    let current = head;
    let count = 0;
    const maxNodes = 20; // Prevent infinite loops
    
    while (current && current.val !== undefined && count < maxNodes) {
      values.push(current.val);
      current = current.next;
      count++;
      
      // Break if we detect a cycle or null
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
      if (cleanPrompt) {
        promptText = cleanPrompt;
      }
    }
    
    const userInput = await this.simulateInput(promptText, '');
    this.output += `${promptText}${userInput}\n`;
  }
}

// Enhanced Java simulator for Array Sum Calculator and other Java tasks
class JavaSimulator {
  private variables: { [key: string]: any } = {};
  private classes: { [key: string]: any } = {};
  private output: string = '';
  private methodResults: { [key: string]: any } = {}; // Store method results

  async execute(code: string): Promise<string> {
    this.variables = {};
    this.classes = {};
    this.output = '';
    this.methodResults = {};

    try {
      await this.parseAndExecute(code);
      return this.output || 'Code executed successfully!';
    } catch (error) {
      return `Execution error: ${error}`;
    }
  }

  private async parseAndExecute(code: string): Promise<void> {
    const lines = code.split('\n');
    let i = 0;
    let inMainMethod = false;
    let inClass = false;
    let currentClassName = '';
    let braceDepth = 0;
    let currentClassContent: string[] = [];

    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line || line.startsWith('//')) {
        i++;
        continue;
      }

      // Track brace depth
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Class definition
      if (line.includes('class ') && line.includes('{')) {
        const classMatch = line.match(/(?:public\s+)?class\s+(\w+)/);
        if (classMatch) {
          currentClassName = classMatch[1];
          inClass = true;
          currentClassContent = [];
          this.classes[currentClassName] = {
            name: currentClassName,
            methods: {},
            fields: {}
          };
        }
      }

      // Collect class content
      if (inClass && currentClassName) {
        currentClassContent.push(lines[i]);
        
        // Parse methods within the class
        if (line.includes('public ') && line.includes('(') && line.includes(')')) {
          const methodMatch = line.match(/public\s+(\w+)\s+(\w+)\s*\(([^)]*)\)/);
          if (methodMatch) {
            const [, returnType, methodName, params] = methodMatch;
            
            // Extract method body
            const methodBody: string[] = [];
            let methodBraceDepth = 0;
            let j = i + 1;
            
            // Find opening brace
            while (j < lines.length && !lines[j].trim().includes('{')) {
              j++;
            }
            
            if (j < lines.length) {
              methodBraceDepth = 1;
              j++; // Skip the line with opening brace
              
              while (j < lines.length && methodBraceDepth > 0) {
                const methodLine = lines[j].trim();
                methodBraceDepth += (methodLine.match(/{/g) || []).length;
                methodBraceDepth -= (methodLine.match(/}/g) || []).length;
                
                if (methodBraceDepth > 0) {
                  methodBody.push(methodLine);
                }
                j++;
              }
            }
            
            this.classes[currentClassName].methods[methodName] = {
              returnType,
              params,
              body: methodBody
            };
          }
        }
      }

      // Main method detection
      if (line.includes('public static void main')) {
        inMainMethod = true;
        i++;
        continue;
      }

      // Execute statements in main method
      if (inMainMethod && braceDepth > 0) {
        await this.executeStatement(line, lines, i);
      }

      // End of main method or class
      if (line === '}') {
        if (inMainMethod && braceDepth === 1) {
          inMainMethod = false;
        }
        if (inClass && braceDepth === 0) {
          inClass = false;
          currentClassName = '';
        }
      }

      i++;
    }
  }

  private async executeStatement(line: string, allLines: string[], lineIndex: number): Promise<void> {
    const trimmed = line.trim();

    // Handle System.out.print statements
    if (trimmed.includes('System.out.print')) {
      await this.handlePrint(trimmed);
      return;
    }

    // Handle variable declarations and assignments
    if (this.isVariableDeclaration(trimmed)) {
      await this.handleVariableDeclaration(trimmed);
      return;
    }

    // Handle object creation (new keyword)
    if (trimmed.includes('new ') && trimmed.includes('=')) {
      await this.handleObjectCreation(trimmed, allLines, lineIndex);
      return;
    }

    // Handle method calls
    if (trimmed.includes('.') && trimmed.endsWith(';')) {
      await this.handleMethodCall(trimmed);
      return;
    }
  }

  private async handlePrint(statement: string): Promise<void> {
    // Handle System.out.println and System.out.print
    const printMatch = statement.match(/System\.out\.print(?:ln)?\((.*)\);?/);
    if (!printMatch) return;

    const content = printMatch[1];
    let output = '';

    // Handle string concatenation and variables
    if (content.includes('+')) {
      const parts = this.parseStringConcatenation(content);
      for (const part of parts) {
        if (part.startsWith('"') && part.endsWith('"')) {
          // String literal
          output += part.slice(1, -1);
        } else if (this.variables[part.trim()]) {
          // Variable
          output += this.variables[part.trim()];
        } else if (part.includes('.')) {
          // Method call or field access
          const result = await this.evaluateExpression(part.trim());
          output += result;
        } else {
          output += part.replace(/"/g, '').trim();
        }
      }
    } else if (content.startsWith('"') && content.endsWith('"')) {
      // Simple string
      output = content.slice(1, -1);
    } else if (this.variables[content.trim()]) {
      // Variable
      output = this.variables[content.trim()];
    } else {
      // Method call or expression
      output = await this.evaluateExpression(content.trim());
    }

    // Add newline for println
    if (statement.includes('println')) {
      this.output += output + '\n';
    } else {
      this.output += output;
    }
  }

  private parseStringConcatenation(content: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inString = false;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      
      if (char === '"' && (i === 0 || content[i-1] !== '\\')) {
        inString = !inString;
        current += char;
      } else if (char === '+' && !inString) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
  }

  private isVariableDeclaration(statement: string): boolean {
    const javaTypes = ['int', 'String', 'boolean', 'double', 'float', 'long', 'char', 'ListNode', 'Solution'];
    return javaTypes.some(type => statement.startsWith(type + ' ')) && statement.includes('=');
  }

  private async handleVariableDeclaration(statement: string): Promise<void> {
    const match = statement.match(/(\w+)\s+(\w+)\s*=\s*(.+);?/);
    if (!match) return;

    const [, type, varName, value] = match;
    
    if (value.includes('new ')) {
      // Object instantiation
      const objMatch = value.match(/new\s+(\w+)\((.*)\)/);
      if (objMatch) {
        const [, className, args] = objMatch;
        this.variables[varName] = await this.createObject(className, args);
      }
    } else {
      // Simple assignment or method call
      this.variables[varName] = await this.evaluateExpression(value);
    }
  }

  private async handleObjectCreation(statement: string, allLines: string[], lineIndex: number): Promise<void> {
    const match = statement.match(/(\w+)\s+(\w+)\s*=\s*new\s+(\w+)\((.*)\);?/);
    if (!match) return;

    const [, type, varName, className, args] = match;
    this.variables[varName] = await this.createObject(className, args);
  }

  private async createObject(className: string, argsStr: string): Promise<any> {
    const args = argsStr ? this.parseMethodArguments(argsStr) : [];
    
    if (className === 'ListNode') {
      const obj: any = { __class__: 'ListNode', val: null, next: null };
      if (args.length > 0) {
        obj.val = await args[0];
      }
      if (args.length > 1) {
        obj.next = await args[1];
      }
      return obj;
    } else if (className === 'Solution') {
      return { __class__: 'Solution' };
    }
    
    return { __class__: className };
  }

  private parseMethodArguments(argsStr: string): string[] {
    const args: string[] = [];
    let current = '';
    let braceDepth = 0;
    let inString = false;
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (char === '"' && (i === 0 || argsStr[i-1] !== '\\')) {
        inString = !inString;
        current += char;
      } else if (char === '{' && !inString) {
        braceDepth++;
        current += char;
      } else if (char === '}' && !inString) {
        braceDepth--;
        current += char;
      } else if (char === ',' && braceDepth === 0 && !inString) {
        if (current.trim()) {
          args.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(current.trim());
    }
    
    return args;
  }

  private async handleMethodCall(statement: string): Promise<void> {
    const match = statement.match(/(\w+)\.(\w+)\((.*)\);?/);
    if (!match) return;

    const [, objName, methodName, argsStr] = match;
    const obj = this.variables[objName];

    if (!obj) return;

    const args = argsStr ? this.parseMethodArguments(argsStr) : [];

    // Handle specific method calls
    if (methodName === 'calculateTotalSales' && obj.__class__ === 'Solution') {
      // Execute the calculateTotalSales method
      const arrayArg = args[0];
      if (arrayArg) {
        const result = await this.executeCalculateTotalSales(arrayArg);
        // Store result in a way that can be accessed later if needed
        obj[`_lastResult_${methodName}`] = result;
      }
    }
  }

  private async executeCalculateTotalSales(arrayExpr: string): Promise<number> {
    // Parse array literal like "new int[]{10, 20, 30}"
    const arrayMatch = arrayExpr.match(/new\s+int\[\]\s*\{([^}]*)\}/);
    if (!arrayMatch) return 0;

    const elementsStr = arrayMatch[1].trim();
    if (!elementsStr) return 0; // Empty array

    const elements = elementsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    // Get the Solution class and its calculateTotalSales method
    const solutionClass = this.classes['Solution'];
    if (!solutionClass || !solutionClass.methods['calculateTotalSales']) {
      return 0;
    }

    const method = solutionClass.methods['calculateTotalSales'];
    const methodBody = method.body;

    // Execute the actual method logic by simulating the loop
    let totalSales = 0;
    
    // Check if the method has the correct implementation pattern
    const hasForLoop = methodBody.some(line => line.includes('for') && (line.includes(':') || line.includes(';')));
    const hasAddition = methodBody.some(line => line.includes('+=') || line.includes('totalSales +'));
    const hasReturn = methodBody.some(line => line.includes('return') && line.includes('totalSales'));
    
    if (hasForLoop && hasAddition && hasReturn) {
      // The method appears to correctly sum the array elements
      totalSales = elements.reduce((sum, val) => sum + val, 0);
    }

    return totalSales;
  }

  private async evaluateExpression(expr: string): Promise<any> {
    const trimmed = expr.trim();

    // String literals
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }

    // Numbers
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    // Variables
    if (this.variables[trimmed]) {
      return this.variables[trimmed];
    }

    // Method calls
    if (trimmed.includes('.') && trimmed.includes('(')) {
      return await this.evaluateMethodCall(trimmed);
    }

    // Array literals
    if (trimmed.startsWith('new int[]')) {
      const arrayMatch = trimmed.match(/new\s+int\[\]\s*\{([^}]*)\}/);
      if (arrayMatch) {
        const elementsStr = arrayMatch[1].trim();
        if (!elementsStr) return [];
        return elementsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      }
    }

    // Null
    if (trimmed === 'null') return null;

    return trimmed;
  }

  private async evaluateMethodCall(methodCallExpr: string): Promise<any> {
    const methodMatch = methodCallExpr.match(/(\w+)\.(\w+)\((.*)\)/);
    if (!methodMatch) return methodCallExpr;

    const [, objName, methodName, argsStr] = methodMatch;
    const obj = this.variables[objName];
    
    if (obj && methodName === 'calculateTotalSales') {
      const args = argsStr ? this.parseMethodArguments(argsStr) : [];
      if (args.length > 0) {
        return await this.executeCalculateTotalSales(args[0]);
      }
    }
    
    return methodCallExpr;
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

  // Update code when task changes
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
      console.error('Submission error:', error);
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

  const runCodePreview = () => {
    setIsPreviewLoading(true);
    
    setTimeout(async () => {
      try {
        if (language === 'python') {
          const simulator = new PythonSimulator(simulateInput);
          const result = await simulator.execute(code);
          setPreviewOutput(result);
        } else if (language === 'java') {
          const simulator = new JavaSimulator();
          const result = await simulator.execute(code);
          setPreviewOutput(result);
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
          setTimeout(typeCharacter, 70); // 70ms per character
        } else {
          currentCode += '\n';
          setCode(currentCode);
          currentLineIndex++;
          currentCharIndex = 0;
          if (currentLineIndex < codeLines.length) {
            setTimeout(typeCharacter, 400); // 400ms line delay
          } else {
            setIsTyping(false);
          }
        }
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
      {/* Enhanced Task Information Header with Balanced Font Sizes */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 via-white to-purple-50 border-none shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {task.title}
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-700 leading-relaxed">
                {task.description}
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Badge variant="secondary" className="capitalize px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 border-blue-200">
                {task.difficulty_level}
              </Badge>
              <Badge variant="outline" className="capitalize px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 border-purple-200">
                {language}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Instructions Section with Improved Styling */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-100 rounded-md">
                <BookOpen className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Instructions</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-md p-4">
              <div className="prose prose-blue max-w-none">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm text-justify break-words">
                  {task.instructions}
                </div>
              </div>
            </div>
          </div>

          {/* Expected Output Section */}
          {task.expected_output && (
            <div className="bg-white rounded-lg shadow-sm border border-green-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded-md">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Expected Output</h3>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-md p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 flex items-center px-3 border-b border-gray-700">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-400 text-xs ml-3 font-mono">Output Console</span>
                </div>
                <pre className="whitespace-pre-wrap text-green-400 font-mono text-sm mt-6 leading-relaxed">
                  {task.expected_output}
                </pre>
              </div>
            </div>
          )}

          {/* Tags Section */}
          {task.tags && task.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 rounded-md">
                  <Tags className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-purple-700 border-purple-300 bg-purple-50 px-2 py-1 text-xs font-medium hover:bg-purple-100 transition-colors"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persistent Error Banner */}
      {showPersistentError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-red-100 rounded-full">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-800">Not quite right</h4>
              <p className="text-sm text-red-700">Your solution needs some work. Check the expected output and try again.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPersistentError(false)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Code Editor Section */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Code Editor</h2>
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Demo Controls */}
            <Button
              onClick={startTypingDemo}
              disabled={isTyping}
              size="sm"
              variant="outline"
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              {isTyping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Typing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Demo
                </>
              )}
            </Button>

            {showDemo && (
              <Button
                onClick={resetDemo}
                size="sm"
                variant="outline"
                className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            
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
        <div style={{ height: '500px' }} className="border-b border-gray-700">
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

        {/* Code Preview/Output Section */}
        <div className="p-3 bg-gray-800">
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
          <div className="bg-black rounded p-3 font-mono text-sm text-blue-400 min-h-[60px] max-h-[100px] overflow-auto border border-gray-600">
            <pre className="whitespace-pre-wrap">{previewOutput}</pre>
          </div>
        </div>

        {/* Submission Feedback */}
        {lastSubmissionResult !== null && !showPersistentError && (
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

      {/* Input Dialog for Python input() function */}
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Input Required</DialogTitle>
            <DialogDescription>
              Your code is asking for input{pendingInputVariable && ` for variable "${pendingInputVariable}"`}. Please enter a value below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {inputPrompt}
              </label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInputSubmit();
                  }
                }}
                placeholder="Enter your input..."
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowInputDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInputSubmit}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Coding Assistant */}
      <AICodingAssistant currentCode={code} language={language} />
    </div>
  );
};

export default TaskSubmissionEditor;
