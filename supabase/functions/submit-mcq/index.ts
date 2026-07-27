import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': 'https://trustuscare.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Server-side only — never sent to client
const ANSWER_KEY = ['b','b','b','b','b','b','b','b','c','a','b','b','b','c','b','b','a','b','c','b']

const SECTIONS = [
  { key: 'core_values',   name: 'Core Values & Professional Boundaries',         idx: [0,1,2,3] },
  { key: 'safeguarding',  name: 'Safeguarding & Risk Management',                 idx: [4,5,6,7] },
  { key: 'medication',    name: 'Medication & Infection Control',                  idx: [8,9,10,11] },
  { key: 'emergency',     name: 'Emergency Situations & Health and Safety',        idx: [12,13,14] },
  { key: 'communication', name: 'Learning Disabilities, Dementia & Communication', idx: [15,16,17,18,19] },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { token, answers } = await req.json()

    if (!token || !Array.isArray(answers) || answers.length !== 20) {
      return new Response(JSON.stringify({ error: 'token and 20 answers required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: app, error: fetchErr } = await supabase
      .from('trustus_applications')
      .select('id, first_name, last_name, email, role_applied, status')
      .eq('token', token)
      .single()

    if (fetchErr || !app) {
      return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (app.status !== 'interview_invited') {
      return new Response(JSON.stringify({ error: 'Test is only available after interview invite' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Score server-side
    let totalScore = 0
    const section_scores: Record<string, number> = {}
    for (const s of SECTIONS) {
      let n = 0
      for (const qi of s.idx) {
        if ((answers[qi] || '').toLowerCase() === ANSWER_KEY[qi]) { totalScore++; n++ }
      }
      section_scores[s.key] = n
    }
    const passed = totalScore >= 12

    // Find the current (non-superseded) attempt, if any — a candidate may be
    // given a second chance, in which case the previous attempt is archived
    // (superseded_at set) rather than overwritten, and a new row is inserted.
    const { data: current } = await supabase
      .from('competency_results')
      .select('id, attempt_number, domain_ratings, strengths, development_areas, outcome, interviewer_name, completed_at')
      .eq('application_id', app.id)
      .is('superseded_at', null)
      .maybeSingle()

    if (current) {
      const { error: supersedeErr } = await supabase
        .from('competency_results')
        .update({ superseded_at: new Date().toISOString() })
        .eq('id', current.id)
      if (supersedeErr) {
        return new Response(JSON.stringify({ error: supersedeErr.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    const nextAttempt = current ? current.attempt_number + 1 : 1

    // Carry forward any existing interviewer scorecard — it assesses the
    // candidate overall, not this specific MCQ attempt, so a retake shouldn't
    // wipe it.
    const resultRow = {
      application_id: app.id,
      attempt_number: nextAttempt,
      mcq_score: totalScore,
      section_scores,
      answers,
      mcq_submitted_at: new Date().toISOString(),
      domain_ratings: current?.domain_ratings ?? {},
      strengths: current?.strengths ?? null,
      development_areas: current?.development_areas ?? null,
      outcome: current?.outcome ?? null,
      interviewer_name: current?.interviewer_name ?? null,
      completed_at: current?.completed_at ?? null,
    }
    const { error: dbErr } = await supabase.from('competency_results').insert(resultRow)

    if (dbErr) {
      return new Response(JSON.stringify({ error: dbErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Email HR
    const sectionRows = SECTIONS.map(s =>
      `<tr><td style="padding:6px 0;color:#666;font-size:13px">${s.name}</td><td style="color:#1C2B4A;font-weight:700;text-align:right;font-size:13px">${section_scores[s.key]} / ${s.idx.length}</td></tr>`
    ).join('')

    const hrEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'TRUSTUS Portal <noreply@trustuscare.com>',
        to: 'info@trustuscare.com',
        subject: `Competency Test ${passed ? 'PASS' : 'FAIL'} — ${app.first_name} ${app.last_name} (${totalScore}/20)${nextAttempt > 1 ? ` — Attempt ${nextAttempt}` : ''}`,
        html: `<div style="font-family:Nunito,Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:${passed ? '#3D6A5A' : '#C8526A'};padding:20px 28px">
            <img src="https://trustuscare.com/images/logo.png" alt="TRUSTUS Care" style="height:40px">
          </div>
          <div style="padding:32px 28px">
            <h2 style="color:#1C2B4A;margin:0 0 6px">Competency Test ${passed ? 'Passed' : 'Failed'}${nextAttempt > 1 ? ` (Attempt ${nextAttempt})` : ''}</h2>
            <p style="font-size:2rem;font-weight:800;color:${passed ? '#3D6A5A' : '#C8526A'};margin:0 0 20px">${totalScore} / 20</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${sectionRows}</table>
            <p style="color:#555;font-size:14px;line-height:1.7">${app.first_name} ${app.last_name} &mdash; ${app.role_applied}<br>Pass threshold: 12 / 20</p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://trustuscare.com/portal" style="background:#3D6A5A;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">View in Portal</a>
            </div>
          </div>
        </div>`,
      }),
    })
    if (!hrEmailRes.ok) {
      console.error('Resend HR notification failed (submit-mcq):', await hrEmailRes.text())
    }

    return new Response(JSON.stringify({ success: true, score: totalScore, passed, section_scores, attempt: nextAttempt }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
