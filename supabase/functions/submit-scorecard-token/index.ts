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
    const { token, email, domain_ratings, strengths, development_areas, outcome, interviewer_name } = await req.json()

    if (!token || !email || !outcome || !interviewer_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Re-validate token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('scorecard_tokens')
      .select('token, application_id, interviewer_email, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Invalid link.' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ error: 'This scorecard has already been submitted.' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This link has expired.' }), {
        status: 410, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Re-verify interviewer email
    if (tokenRow.interviewer_email !== email.toLowerCase().trim()) {
      return new Response(JSON.stringify({ error: 'Verification failed.' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const appId = tokenRow.application_id

    // Check-then-insert-or-update (ON CONFLICT doesn't work through views)
    const { data: existing } = await supabase
      .from('competency_results')
      .select('application_id')
      .eq('application_id', appId)
      .maybeSingle()

    const resultRow = {
      application_id: appId,
      domain_ratings: domain_ratings || {},
      strengths: strengths || null,
      development_areas: development_areas || null,
      outcome,
      interviewer_name,
      completed_at: new Date().toISOString(),
    }

    let writeErr
    if (existing) {
      ;({ error: writeErr } = await supabase
        .from('competency_results')
        .update(resultRow)
        .eq('application_id', appId))
    } else {
      ;({ error: writeErr } = await supabase
        .from('competency_results')
        .insert(resultRow))
    }

    if (writeErr) {
      console.error('competency_results write error:', JSON.stringify(writeErr))
      return new Response(JSON.stringify({ error: 'Failed to save scorecard.' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Burn token — non-fatal if this fails (scorecard already saved)
    const { error: burnErr } = await supabase
      .from('scorecard_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (burnErr) console.error('token burn error:', JSON.stringify(burnErr))

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
