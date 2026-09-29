import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedSports = new Set(['swim', 'bike', 'run', 'gym', 'brick', 'rest']);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function text(value: unknown, fallback: string, maxLength = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || fallback : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: 'Sign in to generate a training plan.' }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData.user) {
    return jsonResponse({ error: 'Your session has expired. Sign in and try again.' }, 401);
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'The planner service is not configured yet.' }, 503);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const weeks = Number(input.weeks);
  const daysPerWeek = Number(input.daysPerWeek);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 16) {
    return jsonResponse({ error: 'Choose a plan length between 1 and 16 weeks.' }, 400);
  }
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    return jsonResponse({ error: 'Training days per week must be between 1 and 7.' }, 400);
  }

  const athlete = {
    goal: text(input.goal, '', 300),
    weeks,
    daysPerWeek,
    experience: text(input.experience, 'Intermediate', 80),
    availability: text(input.availability, 'Flexible training schedule', 300),
    equipment: text(input.equipment, 'Basic training equipment', 300),
    injuries: text(input.injuries, 'No major limitations', 300),
    notes: text(input.notes, '', 500),
    startDate: new Date().toISOString().slice(0, 10),
  };
  if (!athlete.goal) return jsonResponse({ error: 'Add a goal before generating a plan.' }, 400);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        temperature: 0.6,
        max_tokens: 14000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a careful triathlon and endurance coach. Create a realistic, gradual plan with recovery and rest days. Treat health notes conservatively and do not diagnose or prescribe treatment. Return only JSON matching this schema: {"workouts":[{"date":"YYYY-MM-DD","sport":"swim|bike|run|gym|brick|rest","title":"string","notes":"string|null","planned_duration_seconds":number|null,"steps":[{"label":"string","duration_seconds":number|null,"distance_meters":number|null,"target_intensity":"string|null","repeat_count":number}]}]}. Include sessions across the requested weeks, starting on startDate. Respect the requested training days and schedule availability. Keep notes concise, use at most 3 steps per workout, and leave steps empty for rest days.',
          },
          { role: 'user', content: JSON.stringify(athlete) },
        ],
      }),
    });
  } catch {
    return jsonResponse({ error: 'Could not reach OpenRouter. Check the Edge Function network and try again.' }, 502);
  }

  if (!response.ok) {
    console.error('OpenRouter request failed with status', response.status);
    if (response.status === 401) {
      return jsonResponse({ error: 'OpenRouter rejected the API key. Verify the OPENROUTER_API_KEY secret in Supabase.' }, 502);
    }
    if (response.status === 402) {
      return jsonResponse({ error: 'OpenRouter has no available credits. Add credits to the account and try again.' }, 502);
    }
    if (response.status === 429) {
      return jsonResponse({ error: 'OpenRouter is rate-limiting requests. Wait a moment and try again.' }, 502);
    }
    return jsonResponse({ error: 'Plan generation failed. Please try again shortly.' }, 502);
  }

  let result: { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
  try {
    result = await response.json();
  } catch {
    return jsonResponse({ error: 'The planner returned an unreadable response.' }, 502);
  }

  const choice = result.choices?.[0];
  const content = choice?.message?.content;
  if (!content) return jsonResponse({ error: 'The planner returned an empty response.' }, 502);

  if (choice?.finish_reason === 'length') {
    return jsonResponse({ error: 'The generated plan was too long. Try fewer weeks or training days.' }, 502);
  }

  let plan: { workouts?: unknown[] };
  try {
    plan = JSON.parse(content);
  } catch {
    return jsonResponse({ error: 'The planner returned an invalid plan. Please try again.' }, 502);
  }

  if (!Array.isArray(plan.workouts) || plan.workouts.length === 0 || plan.workouts.length > weeks * 7) {
    return jsonResponse({ error: 'The planner returned an incomplete plan. Please try again.' }, 502);
  }

  const workouts = plan.workouts.map((item) => {
    const workout = record(item);
    const steps = Array.isArray(workout.steps) ? workout.steps : [];
    return {
      date: typeof workout.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(workout.date)
        && !Number.isNaN(Date.parse(`${workout.date}T00:00:00Z`))
        ? workout.date
        : athlete.startDate,
      sport: typeof workout.sport === 'string' && allowedSports.has(workout.sport)
        ? workout.sport
        : 'rest',
      title: text(workout.title, 'Training session', 120),
      notes: typeof workout.notes === 'string' ? workout.notes.slice(0, 500) : null,
      planned_duration_seconds: finiteNumber(workout.planned_duration_seconds),
      steps: steps.slice(0, 20).map((step) => {
        const row = record(step);
        return {
          label: text(row.label, 'Training block', 100),
          duration_seconds: finiteNumber(row.duration_seconds),
          distance_meters: finiteNumber(row.distance_meters),
          target_intensity: typeof row.target_intensity === 'string'
            ? row.target_intensity.slice(0, 80)
            : null,
          repeat_count: typeof row.repeat_count === 'number' && Number.isInteger(row.repeat_count)
            ? Math.max(1, Math.min(row.repeat_count, 100))
            : 1,
        };
      }),
    };
  });

  return jsonResponse({ workouts });
});