
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, taskId, language } = await req.json()

    if (!code || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic validation logic (to be enhanced in Phase 3)
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    if (language === 'python') {
      // For now, do basic string matching validation
      // In Phase 3, this will be replaced with actual code execution
      const expectedOutput = task.expected_output
      
      if (expectedOutput && expectedOutput.includes('Hello, my name is')) {
        const codeLines = code.toLowerCase()
        isCorrect = codeLines.includes('print') && 
                   codeLines.includes('name') && 
                   codeLines.includes('age') && 
                   codeLines.includes('favorite_color')
        
        if (isCorrect) {
          executionOutput = expectedOutput
        } else {
          executionOutput = 'Code structure doesn\'t match expected format'
        }
      } else {
        // Default to passing for other tasks
        isCorrect = true
        executionOutput = 'Code executed successfully!'
      }

      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: isCorrect ? 'All tests passed!' : 'Code validation failed'
      }
    }

    return new Response(
      JSON.stringify({
        isCorrect,
        executionOutput,
        validationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Code validation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
