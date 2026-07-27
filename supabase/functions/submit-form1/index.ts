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
    const body = await req.json()
    const { token, details } = body

    if (!token || !details) {
      return new Response(JSON.stringify({ error: 'Missing token or details' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Validate token
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

    if (!['cv_received', 'form1_complete'].includes(app.status)) {
      return new Response(JSON.stringify({ error: 'Application already processed' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const detailRow = {
      application_id: app.id,
      ni_number:           details.ni_number          || null,
      dob:                 details.dob                || null,
      title:               details.title              || null,
      mobile:              details.mobile             || null,
      alt_phone:           details.alt_phone          || null,
      email:               details.email              || null,
      other_training:      details.other_training     || null,
      current_employer:    details.current_employer   ?? null,
      address_history:     details.address_history    ?? [],
      employment_history:  details.employment_history ?? [],
      education:           details.education          ?? [],
      referees:            details.referees           ?? [],
      declaration_signed_at: new Date().toISOString(),
      declaration_signature: details.declaration_signature || null,
    }

    // Check whether a details row already exists (re-submission guard)
    const { data: existing } = await supabase
      .from('trustus_application_details')
      .select('application_id')
      .eq('application_id', app.id)
      .maybeSingle()

    let detailErr
    if (existing) {
      // Re-submission: update in place
      ;({ error: detailErr } = await supabase
        .from('trustus_application_details')
        .update(detailRow)
        .eq('application_id', app.id))
    } else {
      // First submission: insert
      ;({ error: detailErr } = await supabase
        .from('trustus_application_details')
        .insert(detailRow))
    }

    if (detailErr) {
      console.error('detail write error:', JSON.stringify(detailErr))
      return new Response(JSON.stringify({ error: `DB error: ${detailErr.message}` }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Update application status
    const { error: statusErr } = await supabase
      .from('trustus_applications')
      .update({ status: 'form1_complete', form1_submitted_at: new Date().toISOString() })
      .eq('id', app.id)

    if (statusErr) {
      console.error('status update error:', JSON.stringify(statusErr))
      // Non-fatal — details saved; status just didn't flip
    }

    // Notify HR
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TRUSTUS Portal <noreply@trustuscare.com>',
        to: 'info@trustuscare.com',
        subject: `Form 1 Complete — ${app.first_name} ${app.last_name} (${app.role_applied})`,
        html: buildHrEmail(app.first_name, app.last_name, app.email, app.role_applied, app.id),
      }),
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('unhandled error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

function buildHrEmail(first: string, last: string, email: string, role: string, id: string): string {
  return `
  <div style="font-family:Nunito,Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <div style="background:#C8526A;padding:20px 28px">
      <img src="https://trustuscare.com/images/logo.png" alt="TRUSTUS Care" style="height:40px">
    </div>
    <div style="padding:32px 28px">
      <h2 style="color:#1C2B4A;margin:0 0 16px">Application Form Complete</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#888;width:120px">Name</td><td style="color:#1C2B4A;font-weight:600">${first} ${last}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Role</td><td style="color:#1C2B4A;font-weight:600">${role}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Email</td><td style="color:#1C2B4A">${email}</td></tr>
      </table>
      <p style="color:#444;line-height:1.7;margin-top:20px">${first} has completed their full application form. Please log in to the admin panel to review their CV and application details.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="https://trustuscare.com/portal" style="background:#3D6A5A;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">Review Application</a>
      </div>
    </div>
  </div>`
}
