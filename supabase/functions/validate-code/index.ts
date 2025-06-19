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

    // Enhanced validation logic with support for both Python and Java
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    if (language === 'python') {
      const expectedOutput = task.expected_output
      const codeToCheck = code.toLowerCase().trim()
      
      console.log(`[VALIDATE-CODE] Code to check (normalized): ${codeToCheck}`)
      
      if (expectedOutput && expectedOutput.includes('Hello, my name is')) {
        console.log(`[VALIDATE-CODE] Validating introduction task`)
        
        const hasName = codeToCheck.includes('name') && codeToCheck.includes('=') && !codeToCheck.includes('name = "your name"')
        const hasAge = codeToCheck.includes('age') && codeToCheck.includes('=') && !codeToCheck.includes('age = 0')
        const hasColor = (codeToCheck.includes('favorite_color') || codeToCheck.includes('color')) && codeToCheck.includes('=') && !codeToCheck.includes('favorite_color = "blue"')
        const hasPrint = codeToCheck.includes('print') && codeToCheck.includes('name') && codeToCheck.includes('age')
        
        const changedName = !codeToCheck.includes('"your name"') && !codeToCheck.includes("'your name'")
        const changedAge = !codeToCheck.includes('age = 0') && !codeToCheck.includes('age=0')
        const changedColor = !codeToCheck.includes('"blue"') && !codeToCheck.includes("'blue'")
        
        const hasSpaceBeforeComma = codeToCheck.includes('hello ,') || codeToCheck.includes('"hello ,') || codeToCheck.includes("'hello ,")
        
        if (hasSpaceBeforeComma) {
          isCorrect = false
          executionOutput = 'Spacing error: There should be no space before the comma in "Hello, my name is". It should be "Hello, my name is" not "Hello , my name is".'
        } else {
          const hasCorrectHelloFormat = codeToCheck.includes('hello, my name is')
          
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
        
        const hasExactPrint = codeToCheck.includes('print("hello, world!")') || codeToCheck.includes("print('hello, world!')")
        
        isCorrect = hasExactPrint
        
        if (isCorrect) {
          executionOutput = 'Hello, World!'
        } else {
          executionOutput = 'Expected exactly: print("Hello, World!") or print(\'Hello, World!\'). Make sure the capitalization and punctuation match exactly.'
        }
      } else {
        const minCodeLength = 30
        const hasPrint = codeToCheck.includes('print(')
        const hasValidStructure = codeToCheck.split('\n').length >= 3
        
        if (expectedOutput) {
          isCorrect = false
          executionOutput = `This task requires specific output. Your code doesn't produce the expected result: "${expectedOutput}"`
        } else {
          isCorrect = code.length >= minCodeLength && hasPrint && hasValidStructure
          executionOutput = isCorrect ? 'Code validation passed' : `Code must be at least ${minCodeLength} characters, include print statements, and have proper structure`
        }
      }
    } else if (language === 'java') {
      console.log(`[VALIDATE-CODE] Validating Java language`)
      
      const expectedOutput = task.expected_output
      const codeToCheck = code.toLowerCase().trim()
      
      // Check for Array Sum Calculator task
      if (task.title.includes('Array Sum Calculator') || (expectedOutput && expectedOutput.includes('Total sales'))) {
        console.log(`[VALIDATE-CODE] Validating Array Sum Calculator task`)
        
        // Check for required elements in Java array sum solution
        const hasClass = codeToCheck.includes('class') && codeToCheck.includes('solution')
        const hasMethod = codeToCheck.includes('calculatetotalsales') && codeToCheck.includes('int[]')
        const hasLoop = codeToCheck.includes('for') || codeToCheck.includes('while')
        const hasReturn = codeToCheck.includes('return')
        const hasValidLogic = codeToCheck.includes('totalsales') && (codeToCheck.includes('+=') || codeToCheck.includes('+ '))
        
        console.log(`[VALIDATE-CODE] Java validation checks:`)
        console.log(`- hasClass: ${hasClass}`)
        console.log(`- hasMethod: ${hasMethod}`)
        console.log(`- hasLoop: ${hasLoop}`)
        console.log(`- hasReturn: ${hasReturn}`)
        console.log(`- hasValidLogic: ${hasValidLogic}`)
        
        isCorrect = hasClass && hasMethod && hasLoop && hasReturn && hasValidLogic
        
        if (isCorrect) {
          executionOutput = expectedOutput || 'Java array sum solution validated successfully!'
        } else {
          let missing = []
          if (!hasClass) missing.push('Solution class definition')
          if (!hasMethod) missing.push('calculateTotalSales method with int[] parameter')
          if (!hasLoop) missing.push('loop to iterate through array')
          if (!hasReturn) missing.push('return statement')
          if (!hasValidLogic) missing.push('logic to sum array elements (totalSales += sale)')
          
          executionOutput = `Java validation failed. Missing: ${missing.join(', ')}. Make sure you implement the calculateTotalSales method properly.`
        }
        
      } else if (task.title.includes('Reverse') && task.title.includes('Linked List')) {
        console.log(`[VALIDATE-CODE] Validating Reverse Linked List task`)
        
        // Check for required elements in Java linked list reversal
        const hasListNodeClass = codeToCheck.includes('listnode')
        const hasSolutionClass = codeToCheck.includes('class') && codeToCheck.includes('solution')
        const hasReverseMethod = codeToCheck.includes('reverselist')
        const hasPointers = codeToCheck.includes('prev') && codeToCheck.includes('curr') && codeToCheck.includes('next')
        const hasWhileLoop = codeToCheck.includes('while') && codeToCheck.includes('curr')
        const hasPointerManipulation = codeToCheck.includes('curr.next = prev')
        const hasReturnPrev = codeToCheck.includes('return prev')
        
        console.log(`[VALIDATE-CODE] Java Linked List validation checks:`)
        console.log(`- hasListNodeClass: ${hasListNodeClass}`)
        console.log(`- hasSolutionClass: ${hasSolutionClass}`)
        console.log(`- hasReverseMethod: ${hasReverseMethod}`)
        console.log(`- hasPointers: ${hasPointers}`)
        console.log(`- hasWhileLoop: ${hasWhileLoop}`)
        console.log(`- hasPointerManipulation: ${hasPointerManipulation}`)
        console.log(`- hasReturnPrev: ${hasReturnPrev}`)
        
        isCorrect = hasListNodeClass && hasSolutionClass && hasReverseMethod && hasPointers && hasWhileLoop && hasPointerManipulation && hasReturnPrev
        
        if (isCorrect) {
          executionOutput = expectedOutput || 'Java linked list reversal solution validated successfully!'
        } else {
          let missing = []
          if (!hasListNodeClass) missing.push('ListNode class definition')
          if (!hasSolutionClass) missing.push('Solution class')
          if (!hasReverseMethod) missing.push('reverseList method')
          if (!hasPointers) missing.push('prev, curr, and next pointer variables')
          if (!hasWhileLoop) missing.push('while loop with curr != null condition')
          if (!hasPointerManipulation) missing.push('pointer manipulation: curr.next = prev')
          if (!hasReturnPrev) missing.push('return prev statement')
          
          executionOutput = `Java validation failed. Missing: ${missing.join(', ')}. Make sure you implement the three-pointer approach for linked list reversal.`
        }
        
      } else {
        console.log(`[VALIDATE-CODE] Validating generic Java task`)
        
        // Generic Java validation
        const minCodeLength = 50
        const hasClass = codeToCheck.includes('class')
        const hasMethod = codeToCheck.includes('public') || codeToCheck.includes('private') || codeToCheck.includes('protected')
        const hasValidStructure = codeToCheck.split('\n').length >= 5
        
        console.log(`[VALIDATE-CODE] Generic Java validation:`)
        console.log(`- Code length: ${code.length} (min: ${minCodeLength})`)
        console.log(`- Has class: ${hasClass}`)
        console.log(`- Has method: ${hasMethod}`)
        console.log(`- Has valid structure: ${hasValidStructure}`)
        
        if (expectedOutput) {
          isCorrect = code.length >= minCodeLength && hasClass && hasMethod && hasValidStructure
          if (!isCorrect) {
            let missing = []
            if (code.length < minCodeLength) missing.push(`at least ${minCodeLength} characters`)
            if (!hasClass) missing.push('class definition')
            if (!hasMethod) missing.push('method implementation')
            if (!hasValidStructure) missing.push('proper code structure (at least 5 lines)')
            
            executionOutput = `Java validation failed. Missing: ${missing.join(', ')}`
          } else {
            executionOutput = expectedOutput
          }
        } else {
          isCorrect = code.length >= minCodeLength && hasClass && hasMethod && hasValidStructure
          executionOutput = isCorrect ? 'Java code validation passed' : `Java code must have proper class structure, methods, and be at least ${minCodeLength} characters`
        }
      }

      validationResults = {
        testsPassed: isCorrect ? 1 : 0,
        totalTests: 1,
        details: isCorrect ? 'All validation checks passed!' : executionOutput
      }
    } else {
      console.log(`[VALIDATE-CODE] Unsupported language: ${language}`)
      isCorrect = false
      executionOutput = `Language "${language}" is not currently supported. Only Python and Java are supported.`
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
