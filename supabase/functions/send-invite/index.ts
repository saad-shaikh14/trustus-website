import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': 'https://trustuscare.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify the caller is an authenticated HR user
    const { data: { user }, error: authErr } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const { app_id, date, time, location, notes } = await req.json()
    if (!app_id || !date || !time || !location) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Fetch application
    const { data: app, error: fetchErr } = await supabase
      .from('trustus_applications')
      .select('id, first_name, last_name, email, role_applied, status')
      .eq('id', app_id)
      .single()

    if (fetchErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // Format date nicely
    const interviewDate = new Date(`${date}T${time}`).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const interviewTime = new Date(`${date}T${time}`).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    })

    // Send invite email to candidate
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TRUSTUS Care <noreply@trustuscare.com>',
        to: app.email,
        subject: `Interview Invitation — ${app.role_applied} | TRUSTUS Care`,
        html: buildInviteEmail(app.first_name, app.role_applied, interviewDate, interviewTime, location, notes),
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Resend error:', errText)
      throw new Error('Failed to send email')
    }

    // Update status and record invite timestamp
    await supabase
      .from('trustus_applications')
      .update({ status: 'interview_invited', invited_at: new Date().toISOString() })
      .eq('id', app_id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('send-invite error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

function buildInviteEmail(name: string, role: string, date: string, time: string, location: string, notes: string): string {
  return `
  <div style="font-family:Nunito,Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <div style="background:#C8526A;padding:20px 28px">
      <img src="https://trustuscare.com/images/logo.png" alt="TRUSTUS Care" style="height:40px">
    </div>
    <div style="padding:32px 28px">
      <h2 style="color:#1C2B4A;margin:0 0 16px">Interview Invitation</h2>
      <p style="color:#444;line-height:1.7;margin-bottom:24px">Dear ${name},</p>
      <p style="color:#444;line-height:1.7">We are pleased to invite you to an interview for the <strong>${role}</strong> role at TRUSTUS Care.</p>
      <div style="background:#F6EFE9;border-radius:10px;padding:20px 24px;margin:24px 0;border-left:4px solid #3D6A5A">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666;width:100px;font-weight:600">Date</td><td style="color:#111;font-weight:700">${date}</td></tr>
          <tr><td style="padding:6px 0;color:#666;font-weight:600">Time</td><td style="color:#111;font-weight:700">${time}</td></tr>
          <tr><td style="padding:6px 0;color:#666;font-weight:600">Location</td><td style="color:#111">${location}</td></tr>
        </table>
      </div>
      ${notes ? `<p style="color:#444;line-height:1.7"><strong>Additional information:</strong><br>${notes}</p>` : ''}
      <p style="color:#444;line-height:1.7">We look forward to meeting you.</p>
      <p style="color:#444;line-height:1.7">Kind regards,<br><strong>TRUSTUS Care HR Team</strong></p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
      <p style="color:#888;font-size:12px;margin:0">TRUSTUS Care &middot; Office G24, 47 Clarendon Road, Watford, WD17 1HP<br>020 3411 1218 &middot; info@trustuscare.com</p>
    </div>
  </div>`
}
