import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Client-side validation for web courses (HTML, CSS, JS)
function validateWebCode(code: string, task: any) {
  console.log(`[WEB-VALIDATION] Starting validation for task: ${task.title}`)
  
  const results = {
    testsPassed: 0,
    totalTests: 1,
    details: '',
    codeChecks: []
  }
  
  // Get expected output and requirements
  const expectedOutput = task.expected_output?.trim() || ''
  const requirements = task.requirements || []
  
  let isCorrect = true
  let output = 'Code validation completed'
  
  try {
    // Basic syntax validation
    if (!code || code.trim().length === 0) {
      isCorrect = false
      output = 'Error: Empty code submission'
      results.details = 'Code cannot be empty'
      return { isCorrect, output, results }
    }
    
    // For HTML tasks
    if (task.language === 'html' || code.includes('<html>') || code.includes('<!DOCTYPE')) {
      console.log(`[WEB-VALIDATION] Validating HTML code`)
      
      // Check for basic HTML structure
      const hasDoctype = code.includes('<!DOCTYPE html>')
      const hasHtml = code.includes('<html')
      const hasHead = code.includes('<head')
      const hasBody = code.includes('<body')
      
      if (!hasDoctype) {
        results.codeChecks.push('Missing DOCTYPE declaration')
        isCorrect = false
      }
      if (!hasHtml) {
        results.codeChecks.push('Missing <html> tag')
        isCorrect = false
      }
      if (!hasHead) {
        results.codeChecks.push('Missing <head> section')
        isCorrect = false
      }
      if (!hasBody) {
        results.codeChecks.push('Missing <body> section')
        isCorrect = false
      }
    }
    
    // Check for specific requirements if provided
    if (requirements && Array.isArray(requirements)) {
      for (const requirement of requirements) {
        if (typeof requirement === 'string') {
          if (!code.includes(requirement)) {
            results.codeChecks.push(`Missing required element: ${requirement}`)
            isCorrect = false
          }
        }
      }
    }
    
    // If expected output is provided, check for key elements
    if (expectedOutput) {
      console.log(`[WEB-VALIDATION] Checking against expected output pattern`)
      
      // For HTML tasks, check for specific required elements based on expected output
      if (expectedOutput.toLowerCase().includes('title') || expectedOutput.toLowerCase().includes('name')) {
        if (!code.includes('<h1>') && !code.includes('<h2>') && !code.includes('<h3>')) {
          results.codeChecks.push('Missing heading tag (h1, h2, or h3) for title/name')
          isCorrect = false
        }
      }
      
      if (expectedOutput.toLowerCase().includes('paragraph')) {
        if (!code.includes('<p>')) {
          results.codeChecks.push('Missing paragraph tag (<p>)')
          isCorrect = false
        }
      }
      
      if (expectedOutput.toLowerCase().includes('image')) {
        if (!code.includes('<img')) {
          results.codeChecks.push('Missing image tag (<img>)')
          isCorrect = false
        }
      }
      
      if (expectedOutput.toLowerCase().includes('link') || expectedOutput.toLowerCase().includes('clickable')) {
        if (!code.includes('<a ') && !code.includes('<a\n') && !code.includes('<a\t')) {
          results.codeChecks.push('Missing link tag (<a>)')
          isCorrect = false
        }
      }
      
      // Also do the original element extraction for additional validation
      const expectedElements = extractWebElements(expectedOutput)
      const codeElements = extractWebElements(code)
      
      for (const element of expectedElements) {
        if (!codeElements.includes(element)) {
          results.codeChecks.push(`Missing expected element: ${element}`)
          isCorrect = false
        }
      }
    }
    
    results.testsPassed = isCorrect ? 1 : 0
    results.details = isCorrect 
      ? 'Code validation passed! All requirements met.' 
      : `Code validation failed: ${results.codeChecks.join(', ')}`
    
    output = isCorrect 
      ? 'Validation successful - code meets all requirements'
      : `Validation failed: ${results.codeChecks.join(', ')}`
      
  } catch (error) {
    console.error(`[WEB-VALIDATION] Error during validation: ${error.message}`)
    isCorrect = false
    output = `Validation error: ${error.message}`
    results.details = `Validation error: ${error.message}`
  }
  
  console.log(`[WEB-VALIDATION] Result: ${isCorrect ? 'PASS' : 'FAIL'}`)
  return { isCorrect, output, results }
}

// Helper function to extract web elements for comparison
function extractWebElements(content: string): string[] {
  const elements = []
  
  // Extract HTML tags
  const tagMatches = content.match(/<[^>]+>/g) || []
  for (const tag of tagMatches) {
    const cleanTag = tag.replace(/\s+.*/, '>').toLowerCase()
    if (!elements.includes(cleanTag)) {
      elements.push(cleanTag)
    }
  }
  
  // Extract CSS selectors and properties
  const cssMatches = content.match(/[a-zA-Z-]+\s*:\s*[^;]+/g) || []
  for (const css of cssMatches) {
    const property = css.split(':')[0].trim()
    if (!elements.includes(property)) {
      elements.push(property)
    }
  }
  
  return elements
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

    // Get task details with course information
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        course:courses(title, language)
      `)
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
    console.log(`[VALIDATE-CODE] Course: ${task.course?.title}`)
    console.log(`[VALIDATE-CODE] Expected output: ${task.expected_output}`)

    // Check if this is a web course
    const isWebCourse = task.course?.title?.toLowerCase().includes('web systems and technologies')

    // Execute the code first to get actual output
    let isCorrect = false
    let executionOutput = ''
    let validationResults = {}

    try {
      if (isWebCourse) {
        console.log(`[VALIDATE-CODE] Using client-side validation for web course`)
        
        // For web courses, perform strict client-side validation without JDoodle
        const webValidationResult = validateWebCode(code, task)
        isCorrect = webValidationResult.isCorrect
        executionOutput = webValidationResult.output
        validationResults = webValidationResult.results
        
      } else {
        console.log(`[VALIDATE-CODE] Using JDoodle execution for non-web course`)
        
        // Call the execute-code function to run the code via JDoodle
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