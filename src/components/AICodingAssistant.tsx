
import { useState } from 'react';
import { Bot, Send, Loader2, MessageCircle, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AICodingAssistantProps {
  currentCode: string;
  language: string;
}

const AICodingAssistant = ({ currentCode, language }: AICodingAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const quickQuestions = [
    "Explain this code to me",
    "Find bugs in my code",
    "How can I improve this code?",
    "Add comments to explain the logic",
    "Convert this to a different approach"
  ];

  const handleAskQuestion = async (questionText: string = question) => {
    if (!questionText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      console.log('Sending request to AI assistant...');
      
      const { data, error: functionError } = await supabase.functions.invoke('ai-coding-assistant', {
        body: {
          code: currentCode,
          question: questionText,
          language: language
        }
      });

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw functionError;
      }

      if (data?.error) {
        console.error('AI Assistant API error:', data.error);
        setError(data.error);
        toast({
          title: "AI Assistant Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data?.response) {
        setResponse(data.response);
        setQuestion('');
      } else {
        throw new Error('No response received from AI assistant');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = error?.message || 'Failed to get AI assistance. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">AI Coding Assistant</span>
        </div>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-blue-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Quick Questions */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick questions:</p>
          <div className="space-y-1">
            {quickQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => handleAskQuestion(q)}
                disabled={isLoading}
                className="w-full text-left text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Question Input */}
        <div className="mb-4">
          <Textarea
            placeholder="Ask me anything about your code..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[60px] text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleAskQuestion()}
            disabled={isLoading || !question.trim()}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask AI
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-50 rounded p-3 border border-red-200">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-700">Error:</span>
            </div>
            <div className="text-sm text-red-800">
              {error}
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="bg-gray-50 rounded p-3 border">
            <div className="flex items-center mb-2">
              <MessageCircle className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">AI Response:</span>
            </div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICodingAssistant;
