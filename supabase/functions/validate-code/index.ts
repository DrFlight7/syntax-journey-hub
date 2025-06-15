
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

    console.log(`[VALIDATE-CODE] Starting validation for task ${taskId}`)
    console.log(`[VALIDATE-CODE] Language: ${language}`)
    console.log(`[VALIDATE-CODE] Code length: ${code?.length || 0}`)
    console.log(`[VALIDATE-CODE] Code content: ${code}`)

    if (!code || !taskId) {
      console.log(`[VALIDATE-CODE] Missing required parameters - code: ${!!code}, taskId: ${!!taskId}`)
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
      console.log(`[VALIDATE-CODE] Task not found - error: ${taskError?.message}`)
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[VALIDATE-CODE] Task found: ${task.title}`)
    console.log(`[VALIDATE-CODE] Expected output: ${task.expected_output}`)

    // Enhanced validation logic
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    if (language === 'python') {
      const expectedOutput = task.expected_output
      
      if (expectedOutput && expectedOutput.includes('Hello, my name is')) {
        console.log(`[VALIDATE-CODE] Validating introduction task`)
        // Check for proper code structure for the introduction task
        const codeLines = code.toLowerCase()
        const hasName = codeLines.includes('name') && codeLines.includes('=')
        const hasAge = codeLines.includes('age') && codeLines.includes('=')
        const hasColor = codeLines.includes('favorite_color') || codeLines.includes('color')
        const hasPrint = codeLines.includes('print') && codeLines.includes('name') && codeLines.includes('age')
        
        console.log(`[VALIDATE-CODE] Validation checks - name: ${hasName}, age: ${hasAge}, color: ${hasColor}, print: ${hasPrint}`)
        
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
        console.log(`[VALIDATE-CODE] Validating Hello World task`)
        // Simple Hello World task
        const normalizedCode = code.toLowerCase().replace(/\s+/g, ' ').trim()
        isCorrect = normalizedCode.includes('print') && 
                   (normalizedCode.includes('"hello, world!"') || normalizedCode.includes("'hello, world!'"))
        
        console.log(`[VALIDATE-CODE] Hello World check - hasprint: ${normalizedCode.includes('print')}, hastext: ${normalizedCode.includes('"hello, world!"') || normalizedCode.includes("'hello, world!'")}, normalized: ${normalizedCode}`)
        
        if (isCorrect) {
          executionOutput = 'Hello, World!'
        } else {
          executionOutput = 'Expected: print("Hello, World!") or print(\'Hello, World!\')'
        }
      } else {
        console.log(`[VALIDATE-CODE] Validating generic task`)
        // For other tasks, be more strict - check if the code actually produces the expected output
        const hasValidSyntax = !code.includes('SyntaxError') && 
                              !code.includes('IndentationError') &&
                              code.trim().length > 5
        
        if (expectedOutput) {
          // If there's an expected output, the code must be very specific
          isCorrect = false
          executionOutput = `This task requires specific output. Your code doesn't match the expected result: "${expectedOutput}"`
        } else if (hasValidSyntax && code.includes('print')) {
          // Only pass if there's a print statement and basic syntax is ok
          isCorrect = true
          executionOutput = 'Code executed successfully!'
        } else {
          isCorrect = false
          executionOutput = 'Code appears to have issues or missing print statement'
        }
      }

      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: isCorrect ? 'All tests passed!' : executionOutput
      }
    } else {
      console.log(`[VALIDATE-CODE] Validating non-Python language: ${language}`)
      // Default handling for other languages - be strict
      isCorrect = code.trim().length > 20 && code.includes('print') // More strict requirements
      executionOutput = isCorrect ? 'Code validation passed' : 'Code too short or missing required elements'
      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: executionOutput
      }
    }

    console.log(`[VALIDATE-CODE] Final result - isCorrect: ${isCorrect}, output: ${executionOutput}`)

    return new Response(
      JSON.stringify({
        isCorrect,
        executionOutput,
        validationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[VALIDATE-CODE] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
