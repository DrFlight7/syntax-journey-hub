
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    console.log('OpenAI API key present:', !!openAIApiKey);
    console.log('API key length:', openAIApiKey?.length || 0);
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key is not configured. Please add your API key in the Supabase secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI Assistant request:', { question, language, codeLength: code?.length });

    // Validate API key format (OpenAI keys start with "sk-")
    if (!openAIApiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format');
      return new Response(JSON.stringify({ 
        error: 'Invalid OpenAI API key format. Please check your API key.' 
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

    console.log('Making request to OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      
      let errorMessage = 'An error occurred while calling OpenAI API';
      if (response.status === 401) {
        errorMessage = 'Invalid OpenAI API key. Please check your API key in the Supabase secrets.';
      } else if (response.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request to OpenAI API. Please try a different question.';
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response structure:', data);
      return new Response(JSON.stringify({ 
        error: 'Invalid response from OpenAI API' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = data.choices[0].message.content;

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
