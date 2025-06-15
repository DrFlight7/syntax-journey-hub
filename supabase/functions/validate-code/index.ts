
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
    console.log(`[VALIDATE-CODE] Raw code content:`, JSON.stringify(code))

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

    // Enhanced validation logic with much stricter checking
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    if (language === 'python') {
      const expectedOutput = task.expected_output
      const codeToCheck = code.toLowerCase().trim()
      
      console.log(`[VALIDATE-CODE] Code to check (normalized): ${codeToCheck}`)
      
      if (expectedOutput && expectedOutput.includes('Hello, my name is')) {
        console.log(`[VALIDATE-CODE] Validating introduction task`)
        
        // Very strict validation for introduction task - check exact format
        const hasName = codeToCheck.includes('name') && codeToCheck.includes('=') && !codeToCheck.includes('name = "your name"')
        const hasAge = codeToCheck.includes('age') && codeToCheck.includes('=') && !codeToCheck.includes('age = 0')
        const hasColor = (codeToCheck.includes('favorite_color') || codeToCheck.includes('color')) && codeToCheck.includes('=') && !codeToCheck.includes('favorite_color = "blue"')
        const hasPrint = codeToCheck.includes('print') && codeToCheck.includes('name') && codeToCheck.includes('age')
        
        // Check if they actually changed the default values
        const changedName = !codeToCheck.includes('"your name"') && !codeToCheck.includes("'your name'")
        const changedAge = !codeToCheck.includes('age = 0') && !codeToCheck.includes('age=0')
        const changedColor = !codeToCheck.includes('"blue"') && !codeToCheck.includes("'blue'")
        
        // NEW: Check for exact format in the first print statement
        const hasCorrectHelloFormat = codeToCheck.includes('print("hello, my name is"') || codeToCheck.includes("print('hello, my name is'")
        const hasIncorrectSpacing = codeToCheck.includes('print("hello , my name is"') || codeToCheck.includes("print('hello , my name is'")
        
        console.log(`[VALIDATE-CODE] Validation checks:`)
        console.log(`- hasName: ${hasName}`)
        console.log(`- hasAge: ${hasAge}`)
        console.log(`- hasColor: ${hasColor}`)
        console.log(`- hasPrint: ${hasPrint}`)
        console.log(`- changedName: ${changedName}`)
        console.log(`- changedAge: ${changedAge}`)
        console.log(`- changedColor: ${changedColor}`)
        console.log(`- hasCorrectHelloFormat: ${hasCorrectHelloFormat}`)
        console.log(`- hasIncorrectSpacing: ${hasIncorrectSpacing}`)
        
        if (hasIncorrectSpacing) {
          isCorrect = false
          executionOutput = 'Format error: Extra space detected in "Hello , my name is". It should be "Hello, my name is" (no space after "Hello").'
        } else {
          isCorrect = hasName && hasAge && hasColor && hasPrint && changedName && changedAge && changedColor && hasCorrectHelloFormat
          
          if (isCorrect) {
            executionOutput = expectedOutput
          } else {
            let missing = []
            if (!hasName) missing.push('name variable')
            if (!hasAge) missing.push('age variable')
            if (!hasColor) missing.push('favorite_color variable')
            if (!hasPrint) missing.push('print statement with name and age')
            if (!changedName) missing.push('change the name from default "Your Name"')
            if (!changedAge) missing.push('change the age from default 0')
            if (!changedColor) missing.push('change the color from default "blue"')
            if (!hasCorrectHelloFormat) missing.push('correct format for "Hello, my name is"')
            
            executionOutput = `Code validation failed. Issues found: ${missing.join(', ')}`
          }
        }
      } else if (expectedOutput && expectedOutput.includes('Hello, World!')) {
        console.log(`[VALIDATE-CODE] Validating Hello World task`)
        
        // Very strict Hello World validation
        const hasExactPrint = codeToCheck.includes('print("hello, world!")') || codeToCheck.includes("print('hello, world!')")
        
        console.log(`[VALIDATE-CODE] Hello World check - hasExactPrint: ${hasExactPrint}`)
        
        isCorrect = hasExactPrint
        
        if (isCorrect) {
          executionOutput = 'Hello, World!'
        } else {
          executionOutput = 'Expected exactly: print("Hello, World!") or print(\'Hello, World!\'). Make sure the capitalization and punctuation match exactly.'
        }
      } else {
        console.log(`[VALIDATE-CODE] Validating generic task`)
        
        // For tasks without specific expected output, be very strict
        const minCodeLength = 30 // Require substantial code
        const hasPrint = codeToCheck.includes('print(')
        const hasValidStructure = codeToCheck.split('\n').length >= 3 // At least 3 lines
        
        console.log(`[VALIDATE-CODE] Generic validation:`)
        console.log(`- Code length: ${code.length} (min: ${minCodeLength})`)
        console.log(`- Has print: ${hasPrint}`)
        console.log(`- Has valid structure: ${hasValidStructure}`)
        
        if (expectedOutput) {
          // If there's expected output but it's not a known pattern, be very strict
          isCorrect = false
          executionOutput = `This task requires specific output. Your code doesn't produce the expected result: "${expectedOutput}"`
        } else {
          isCorrect = code.length >= minCodeLength && hasPrint && hasValidStructure
          executionOutput = isCorrect ? 'Code validation passed' : `Code must be at least ${minCodeLength} characters, include print statements, and have proper structure`
        }
      }

      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: isCorrect ? 'All validation checks passed!' : executionOutput
      }
    } else {
      console.log(`[VALIDATE-CODE] Validating non-Python language: ${language}`)
      // Very strict for other languages
      isCorrect = false
      executionOutput = 'Only Python code validation is currently supported'
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
