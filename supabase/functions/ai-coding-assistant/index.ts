
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleAiApiKey = Deno.env.get('GOOGLE_AI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, question, language } = await req.json();

    // Check if API key exists and log its presence (not the actual key)
    console.log('Google AI API key present:', !!googleAiApiKey);
    console.log('API key length:', googleAiApiKey?.length || 0);
    
    if (!googleAiApiKey) {
      console.error('Google AI API key not found in environment');
      return new Response(JSON.stringify({ 
        error: 'Google AI API key is not configured. Please add your API key in the Supabase secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI Assistant request:', { question, language, codeLength: code?.length });

    // Validate API key format (Google AI keys start with "AIza")
    if (!googleAiApiKey.startsWith('AIza')) {
      console.error('Invalid Google AI API key format');
      return new Response(JSON.stringify({ 
        error: 'Invalid Google AI API key format. Please check your API key.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemMessage = `You are an expert coding assistant specialized in helping users learn programming. 
    
Guidelines:
- Be concise but thorough in your explanations
- Focus on educational value - explain WHY not just WHAT
- If code has errors, explain what's wrong and how to fix it
- Provide working code examples when helpful
- Be encouraging and supportive
- Format code blocks properly with language specification
- For ${language} specifically, follow best practices and conventions`;

    let userMessage = question;
    if (code) {
      userMessage = `Here's my ${language} code:

\`\`\`${language}
${code}
\`\`\`

Question: ${question}`;
    }

    console.log('Making request to Google AI API...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${googleAiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemMessage}\n\nUser: ${userMessage}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    console.log('Google AI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API error details:', errorText);
      
      let errorMessage = 'An error occurred while calling Google AI API';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid Google AI API key. Please check your API key in the Supabase secrets.';
      } else if (response.status === 429) {
        errorMessage = 'Google AI API rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request to Google AI API. Please try a different question.';
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error('Unexpected Google AI response structure:', data);
      return new Response(JSON.stringify({ 
        error: 'Invalid response from Google AI API' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    console.log('AI Assistant response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in AI coding assistant:', error);
    
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
