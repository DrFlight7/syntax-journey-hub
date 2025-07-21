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

    // Execute the code first to get actual output
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    try {
      console.log(`[VALIDATE-CODE] Executing code to get actual output`)
      
      // Call the execute-code function to run the code
      const { data: executeResult, error: executeError } = await supabase.functions.invoke('execute-code', {
        body: { code, language }
      })

      if (executeError) {
        console.log(`[VALIDATE-CODE] Code execution error: ${executeError.message}`)
        isCorrect = false
        
        // Check if this is a service limit issue
        if (executeError.message.includes('Daily limit reached') || executeError.message.includes('429')) {
          executionOutput = `Service temporarily unavailable: The code execution service has reached its daily limit. Please try again later.`
          validationResults = {
            testsPassed: 0,
            totalTests: 1,
            details: 'SERVICE_LIMIT_REACHED',
            serviceError: true
          }
        } else {
          executionOutput = `Code execution failed: ${executeError.message}`
          validationResults = {
            testsPassed: 0,
            totalTests: 1,
            details: executionOutput
          }
        }
      } else if (executeResult?.error) {
        console.log(`[VALIDATE-CODE] Code execution returned error: ${executeResult.error}`)
        isCorrect = false
        
        // Check if this is a service limit issue
        if (executeResult.error.includes('Daily limit reached') || executeResult.error.includes('429')) {
          executionOutput = `Service temporarily unavailable: The code execution service has reached its daily limit. Please try again later.`
          validationResults = {
            testsPassed: 0,
            totalTests: 1,
            details: 'SERVICE_LIMIT_REACHED',
            serviceError: true
          }
        } else {
          executionOutput = `Code execution error: ${executeResult.error}`
          validationResults = {
            testsPassed: 0,
            totalTests: 1,
            details: executionOutput
          }
        }
      } else {
        const actualOutput = executeResult?.output?.trim() || ''
        const expectedOutput = task.expected_output?.trim() || ''
        
        console.log(`[VALIDATE-CODE] Actual output: "${actualOutput}"`)
        console.log(`[VALIDATE-CODE] Expected output: "${expectedOutput}"`)
        
        if (expectedOutput) {
          // Compare actual output with expected output
          isCorrect = actualOutput === expectedOutput
          
          if (isCorrect) {
            executionOutput = actualOutput
            validationResults = {
              testsPassed: 1,
              totalTests: 1,
              details: 'Code output matches expected result!'
            }
          } else {
            executionOutput = `Output mismatch!\nExpected: "${expectedOutput}"\nActual: "${actualOutput}"`
            validationResults = {
              testsPassed: 0,
              totalTests: 1,
              details: executionOutput
            }
          }
        } else {
          // No expected output defined, just check if code runs successfully
          isCorrect = executeResult?.isExecutionSuccess || false
          executionOutput = actualOutput || 'Code executed successfully'
          validationResults = {
            testsPassed: isCorrect ? 1 : 0,
            totalTests: 1,
            details: isCorrect ? 'Code executed successfully' : 'Code execution failed'
          }
        }
      }
    } catch (error) {
      console.log(`[VALIDATE-CODE] Error during code execution: ${error.message}`)
      isCorrect = false
      executionOutput = `Validation error: ${error.message}`
      validationResults = {
        testsPassed: 0,
        totalTests: 1,
        details: executionOutput
      }
    }

    console.log(`[VALIDATE-CODE] FINAL VALIDATION RESULT:`)
    console.log(`- isCorrect: ${isCorrect}`)
    console.log(`- executionOutput: ${executionOutput}`)
    console.log(`- validationResults:`, JSON.stringify(validationResults))

    const response = {
      isCorrect,
      executionOutput,
      validationResults
    }

    console.log(`[VALIDATE-CODE] Returning response:`, JSON.stringify(response))

    return new Response(
      JSON.stringify(response),
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