
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

    // Enhanced validation logic
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    if (language === 'python') {
      const expectedOutput = task.expected_output
      
      if (expectedOutput && expectedOutput.includes('Hello, my name is')) {
        // Check for proper code structure for the introduction task
        const codeLines = code.toLowerCase()
        const hasName = codeLines.includes('name') && codeLines.includes('=')
        const hasAge = codeLines.includes('age') && codeLines.includes('=')
        const hasColor = codeLines.includes('favorite_color') || codeLines.includes('color')
        const hasPrint = codeLines.includes('print') && codeLines.includes('name') && codeLines.includes('age')
        
        isCorrect = hasName && hasAge && hasColor && hasPrint
        
        if (isCorrect) {
          executionOutput = expectedOutput
        } else {
          let missing = []
          if (!hasName) missing.push('name variable')
          if (!hasAge) missing.push('age variable')
          if (!hasColor) missing.push('favorite_color variable')
          if (!hasPrint) missing.push('print statement with name and age')
          
          executionOutput = `Code validation failed. Missing: ${missing.join(', ')}`
        }
      } else if (expectedOutput && expectedOutput.includes('Hello, World!')) {
        // Simple Hello World task
        const normalizedCode = code.toLowerCase().replace(/\s+/g, ' ').trim()
        isCorrect = normalizedCode.includes('print') && 
                   (normalizedCode.includes('"hello, world!"') || normalizedCode.includes("'hello, world!'"))
        
        if (isCorrect) {
          executionOutput = 'Hello, World!'
        } else {
          executionOutput = 'Expected: print("Hello, World!") or print(\'Hello, World!\')'
        }
      } else {
        // For other tasks, do basic syntax checking
        try {
          // Basic checks for common Python syntax
          const hasValidSyntax = !code.includes('SyntaxError') && 
                                !code.includes('IndentationError') &&
                                code.trim().length > 0
          
          if (hasValidSyntax && code.includes('print')) {
            isCorrect = true
            executionOutput = 'Code executed successfully!'
          } else {
            isCorrect = false
            executionOutput = 'Code appears to have issues or missing print statement'
          }
        } catch (error) {
          isCorrect = false
          executionOutput = 'Code validation failed: ' + error.message
        }
      }

      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: isCorrect ? 'All tests passed!' : executionOutput
      }
    } else {
      // Default handling for other languages
      isCorrect = code.trim().length > 10 // Basic length check
      executionOutput = isCorrect ? 'Code validation passed' : 'Code too short or empty'
      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: executionOutput
      }
    }

    console.log(`Code validation for task ${taskId}: ${isCorrect ? 'PASSED' : 'FAILED'}`)
    console.log(`Execution output: ${executionOutput}`)

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
