import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JDoodleRequest {
  clientId: string;
  clientSecret: string;
  script: string;
  language: string;
  versionIndex: string;
  stdin?: string;
}

interface JDoodleResponse {
  output: string;
  statusCode: number;
  memory: string;
  cpuTime: string;
}

const languageMapping: { [key: string]: { language: string; versionIndex: string } } = {
  'python': { language: 'python3', versionIndex: '4' },
  'java': { language: 'java', versionIndex: '4' },
  'javascript': { language: 'nodejs', versionIndex: '4' },
  'cpp': { language: 'cpp', versionIndex: '5' },
  'c': { language: 'c', versionIndex: '5' }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, language, input } = await req.json()

    console.log(`[EXECUTE-CODE] Starting execution for language: ${language}`)
    console.log(`[EXECUTE-CODE] Code length: ${code?.length || 0}`)

    if (!code || !language) {
      console.log(`[EXECUTE-CODE] Missing required parameters - code: ${!!code}, language: ${!!language}`)
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get JDoodle credentials from Supabase secrets
    const clientID = Deno.env.get('JDOODLE_CLIENT_ID')
    const clientSecret = Deno.env.get('JDOODLE_CLIENT_SECRET')

    if (!clientID || !clientSecret) {
      console.log(`[EXECUTE-CODE] Missing JDoodle credentials`)
      return new Response(
        JSON.stringify({ error: 'JDoodle credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map language to JDoodle format
    const languageConfig = languageMapping[language.toLowerCase()]
    if (!languageConfig) {
      console.log(`[EXECUTE-CODE] Unsupported language: ${language}`)
      return new Response(
        JSON.stringify({ error: `Language "${language}" is not supported` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare JDoodle API request
    const jdoodleRequest: JDoodleRequest = {
      clientId: clientID,
      clientSecret,
      script: code,
      language: languageConfig.language,
      versionIndex: languageConfig.versionIndex,
      stdin: input || ''
    }

    console.log(`[EXECUTE-CODE] Making request to JDoodle API`)
    console.log(`[EXECUTE-CODE] Language: ${languageConfig.language}, Version: ${languageConfig.versionIndex}`)

    // Make request to JDoodle API
    const jdoodleResponse = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jdoodleRequest)
    })

    if (!jdoodleResponse.ok) {
      const errorText = await jdoodleResponse.text()
      console.error(`[EXECUTE-CODE] JDoodle API error: ${jdoodleResponse.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ 
          error: 'Code execution failed', 
          details: `JDoodle API returned ${jdoodleResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result: JDoodleResponse = await jdoodleResponse.json()
    
    console.log(`[EXECUTE-CODE] JDoodle response:`)
    console.log(`[EXECUTE-CODE] Output: ${result.output}`)
    console.log(`[EXECUTE-CODE] Status: ${result.statusCode}`)
    console.log(`[EXECUTE-CODE] Memory: ${result.memory}`)
    console.log(`[EXECUTE-CODE] CPU Time: ${result.cpuTime}`)

    // Format response
    const response = {
      output: result.output || '',
      statusCode: result.statusCode || 0,
      memory: result.memory || '',
      cpuTime: result.cpuTime || '',
      success: result.statusCode === 200
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[EXECUTE-CODE] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})