import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': 'https://trustuscare.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { token, email } = await req.json()
    if (!token || !email) {
      return new Response(JSON.stringify({ error: 'Missing token or email' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tokenRow, error: tokenErr } = await supabase
      .from('scorecard_tokens')
      .select('token, application_id, interviewer_email, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Invalid or unrecognised link.' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ error: 'This scorecard has already been submitted.' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This link has expired. Please ask HR to generate a new one.' }), {
        status: 410, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Gate: verify against interviewer_email, NOT candidate email
    if (tokenRow.interviewer_email !== email.toLowerCase().trim()) {
      return new Response(JSON.stringify({ error: 'Email address not recognised. Please check and try again.' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Return candidate name + role only (nothing sensitive)
    const { data: app, error: appErr } = await supabase
      .from('trustus_applications')
      .select('first_name, last_name, role_applied')
      .eq('id', tokenRow.application_id)
      .single()

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found.' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      first_name: app.first_name,
      last_name: app.last_name,
      role_applied: app.role_applied,
    }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
