import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PROVIDERS = ["gemini", "openai", "anthropic"];
const ALLOWED_MODELS: Record<string, string[]> = {
  gemini: ["gemini-3.6-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
};

function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "[UUID_REDACTED]",
    );
}

function sanitizeError(msg: string): string {
  if (!msg) return "Error desconocido";
  return msg
    .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]");
}

function estimateCost(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  let rateIn = 0.00015;
  let rateOut = 0.0006;
  if (provider === "openai") {
    rateIn = 0.0025;
    rateOut = 0.01;
  } else if (provider === "anthropic") {
    rateIn = 0.003;
    rateOut = 0.015;
  }
  return (tokensIn / 1000) * rateIn + (tokensOut / 1000) * rateOut;
}

async function checkCancelled(
  supabaseAdmin: ReturnType<typeof createClient>,
  jobId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("generation_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "cancelled";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Authenticate JWT Bearer Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error_code: "PROVIDER_AUTH_ERROR",
          error_message: "Missing Authorization header",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error_code: "SERVER_CONFIG_ERROR",
          error_message: "Supabase environment variables not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error_code: "PROVIDER_AUTH_ERROR",
          error_message: "Token de usuario inválido o expirado",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Parse Body and Reject Forbidden Identity Overrides
    const bodyText = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({
          error_code: "INVALID_REQUEST",
          error_message: "Cuerpo de solicitud JSON inválido",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const forbiddenFields = [
      "user_id",
      "userId",
      "role",
      "api_key",
      "apiKey",
      "jwt",
      "token",
      "secret",
      "authorization",
    ];
    for (const field of forbiddenFields) {
      if (field in body) {
        return new Response(
          JSON.stringify({
            error_code: "INVALID_REQUEST",
            error_message: `El campo '${field}' no está permitido en el cuerpo de la solicitud.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const lessonId = String(body.lesson_id || "");
    const rawPrompt = String(body.prompt || "").trim();
    const level = String(body.level || "Intermedio");
    const duration = Number(body.duration || 20);
    const language = String(body.language || "Español");
    const tone = String(body.tone || "Práctico y Profesional");
    const audience = String(body.audience || "Estudiantes");
    const objectives = body.objectives;
    const provider = String(body.provider || "gemini").toLowerCase();
    const model = String(body.model || "gemini-3.6-flash");
    const temperature = Number(body.temperature ?? 0.7);

    if (!lessonId) {
      return new Response(
        JSON.stringify({
          error_code: "INVALID_REQUEST",
          error_message: "Se requiere 'lesson_id'.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!rawPrompt) {
      return new Response(
        JSON.stringify({
          error_code: "INVALID_REQUEST",
          error_message: "El prompt no puede estar vacío.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (rawPrompt.length > 4000) {
      return new Response(
        JSON.stringify({
          error_code: "INVALID_REQUEST",
          error_message: "El prompt excede la longitud máxima de 4000 caracteres.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Allowlist Check
    if (!ALLOWED_PROVIDERS.includes(provider) || !ALLOWED_MODELS[provider]?.includes(model)) {
      return new Response(
        JSON.stringify({
          error_code: "INVALID_PROVIDER_MODEL",
          error_message: `Proveedor '${provider}' o modelo '${model}' no permitido.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Authorization: Verify Instructor Owner or Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: lesson, error: lessonErr } = await supabaseAdmin
      .from("lessons")
      .select("id, course_id")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr || !lesson) {
      return new Response(
        JSON.stringify({ error_code: "LESSON_NOT_FOUND", error_message: "La lección no existe." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("instructor_id")
      .eq("id", lesson.course_id)
      .maybeSingle();

    const isAdmin = Boolean(adminRole);
    const isInstructorOwner = course?.instructor_id === user.id;

    if (!isAdmin && !isInstructorOwner) {
      return new Response(
        JSON.stringify({
          error_code: "PERMISSION_DENIED",
          error_message:
            "Permiso denegado: No eres el instructor propietario de este curso ni administrador.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Sanitize Prompt
    const sanitizedPrompt = sanitizeText(rawPrompt);

    // 6. Create Job in DB using RPC with authenticated user context
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: jobRes, error: jobErr } = await userClient.rpc("create_generation_job_rpc", {
      p_lesson_id: lessonId,
      p_provider: provider,
      p_model: model,
      p_prompt: sanitizedPrompt,
      p_metadata: { context: { level, duration, language, tone, audience, objectives } },
    });

    if (jobErr || !jobRes?.job_id) {
      return new Response(
        JSON.stringify({
          error_code: "JOB_CREATION_FAILED",
          error_message:
            jobErr?.message || "No se pudo crear el trabajo de generación en la base de datos.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const jobId = jobRes.job_id;

    // Transition job to 'running'
    await supabaseAdmin.rpc("update_generation_job_rpc", {
      p_job_id: jobId,
      p_status: "running",
    });

    // Cancellation check before planner / provider call
    if (await checkCancelled(supabaseAdmin, jobId)) {
      return new Response(
        JSON.stringify({
          error_code: "JOB_CANCELLED",
          error_message: "El trabajo de generación fue cancelado.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Execute Provider
    const isMockMode = Deno.env.get("AI_MOCK_MODE") === "true";

    let plan: unknown;
    let blocks: unknown[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    const repairCount = 0;

    if (isMockMode) {
      plan = {
        title: `Lección: ${sanitizedPrompt.substring(0, 40)}`,
        objectives: Array.isArray(objectives)
          ? objectives
          : ["Comprender conceptos clave", "Aplicar prácticas recomendadas"],
        level,
        estimatedDurationMinutes: duration,
        sections: [
          {
            id: "sec-1",
            title: "Introducción y Fundamentos",
            purpose: "Establecer bases claras del tema.",
            targetBlockTypes: ["heading", "paragraph", "callout"],
            keyPoints: ["Conceptos clave", "Sintaxis principal"],
          },
          {
            id: "sec-2",
            title: "Ejemplos y Código Práctico",
            purpose: "Demostrar implementación con código.",
            targetBlockTypes: ["heading", "paragraph", "code", "checklist"],
            keyPoints: ["Implementación paso a paso"],
          },
        ],
        estimatedBlocksCount: 6,
      };

      blocks = [
        {
          id: crypto.randomUUID(),
          type: "heading",
          content_json: { text: `Lección sobre ${sanitizedPrompt.substring(0, 30)}`, level: 1 },
        },
        {
          id: crypto.randomUUID(),
          type: "paragraph",
          content_json: {
            text: `En esta lección exploraremos en detalle los conceptos de ${sanitizedPrompt}.`,
          },
        },
        {
          id: crypto.randomUUID(),
          type: "callout",
          content_json: {
            type: "info",
            title: "Objetivo Principal",
            text: "Dominar la arquitectura e implementación paso a paso.",
          },
        },
        {
          id: crypto.randomUUID(),
          type: "heading",
          content_json: { text: "Ejemplo Práctico", level: 2 },
        },
        {
          id: crypto.randomUUID(),
          type: "code",
          content_json: {
            language: "typescript",
            filename: "example.ts",
            code: "// Código generado para la lección\nconsole.log('Hola Mundo');",
          },
        },
        {
          id: crypto.randomUUID(),
          type: "checklist",
          content_json: {
            items: [
              { id: "c1", text: "Repasar conceptos básicos", checked: true },
              { id: "c2", text: "Ejecutar el ejemplo", checked: false },
            ],
          },
        },
      ];

      tokensIn = Math.ceil(sanitizedPrompt.length / 4);
      tokensOut = 450;
    } else {
      let apiKey = "";
      let url = "";
      let headers: Record<string, string> = {};
      let payload: unknown = null;

      if (provider === "gemini") {
        apiKey = Deno.env.get("GEMINI_API_KEY") || "";
        if (!apiKey) {
          await markJobFailed(
            supabaseAdmin,
            jobId,
            "PROVIDER_AUTH_ERROR",
            "GEMINI_API_KEY no configurada en el servidor.",
          );
          return new Response(
            JSON.stringify({
              error_code: "PROVIDER_AUTH_ERROR",
              error_message: "GEMINI_API_KEY no configurada en el servidor.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        headers = { "Content-Type": "application/json" };
        payload = {
          systemInstruction: {
            parts: [
              {
                text: "Eres un diseñador instruccional experto. Responde únicamente en formato JSON válido con la estructura: { plan: {...}, blocks: [...] }.",
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: `Genera una lección estructurada para el prompt: '${sanitizedPrompt}'. Nivel: ${level}, Duración: ${duration}min, Idioma: ${language}.`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature },
        };
      } else if (provider === "openai") {
        apiKey = Deno.env.get("OPENAI_API_KEY") || "";
        if (!apiKey) {
          await markJobFailed(
            supabaseAdmin,
            jobId,
            "PROVIDER_AUTH_ERROR",
            "OPENAI_API_KEY no configurada en el servidor.",
          );
          return new Response(
            JSON.stringify({
              error_code: "PROVIDER_AUTH_ERROR",
              error_message: "OPENAI_API_KEY no configurada en el servidor.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        url = "https://api.openai.com/v1/chat/completions";
        headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
        payload = {
          model,
          messages: [
            {
              role: "system",
              content:
                "Eres un diseñador instruccional experto. Responde únicamente en formato JSON con la estructura { plan: {...}, blocks: [...] }.",
            },
            {
              role: "user",
              content: `Genera una lección estructurada para: '${sanitizedPrompt}'. Nivel: ${level}.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature,
        };
      } else if (provider === "anthropic") {
        apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
        if (!apiKey) {
          await markJobFailed(
            supabaseAdmin,
            jobId,
            "PROVIDER_AUTH_ERROR",
            "ANTHROPIC_API_KEY no configurada en el servidor.",
          );
          return new Response(
            JSON.stringify({
              error_code: "PROVIDER_AUTH_ERROR",
              error_message: "ANTHROPIC_API_KEY no configurada en el servidor.",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        url = "https://api.anthropic.com/v1/messages";
        headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };
        payload = {
          model,
          system:
            "Eres un diseñador instruccional experto. Responde únicamente en formato JSON con { plan: {...}, blocks: [...] }.",
          messages: [
            {
              role: "user",
              content: `Genera una lección estructurada para: '${sanitizedPrompt}'.`,
            },
          ],
          max_tokens: 4000,
          temperature,
        };
      }

      let resp: Response;
      try {
        resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
      } catch (fetchErr) {
        const msg = sanitizeError(fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
        await markJobFailed(supabaseAdmin, jobId, "PROVIDER_TIMEOUT", msg);
        return new Response(
          JSON.stringify({ error_code: "PROVIDER_TIMEOUT", error_message: msg }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!resp.ok) {
        let errCode = "PROVIDER_UNAVAILABLE";
        if (resp.status === 401 || resp.status === 403) errCode = "PROVIDER_AUTH_ERROR";
        else if (resp.status === 429) errCode = "PROVIDER_RATE_LIMIT";
        else if (resp.status === 504) errCode = "PROVIDER_TIMEOUT";

        const rawErrText = await resp.text().catch(() => "");
        const sanitizedErr = sanitizeError(rawErrText.substring(0, 300));
        await markJobFailed(supabaseAdmin, jobId, errCode, sanitizedErr);

        return new Response(
          JSON.stringify({
            error_code: errCode,
            error_message: `Error del proveedor (${resp.status}): ${sanitizedErr}`,
          }),
          {
            status: resp.status >= 500 ? 502 : 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const json = await resp.json().catch(() => null);
      let rawText = "";

      if (provider === "gemini") {
        rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        tokensIn = json?.usageMetadata?.promptTokenCount || Math.ceil(sanitizedPrompt.length / 4);
        tokensOut = json?.usageMetadata?.candidatesTokenCount || Math.ceil(rawText.length / 4);
      } else if (provider === "openai") {
        rawText = json?.choices?.[0]?.message?.content || "";
        tokensIn = json?.usage?.prompt_tokens || Math.ceil(sanitizedPrompt.length / 4);
        tokensOut = json?.usage?.completion_tokens || Math.ceil(rawText.length / 4);
      } else if (provider === "anthropic") {
        rawText = json?.content?.[0]?.text || "";
        tokensIn = json?.usage?.input_tokens || Math.ceil(sanitizedPrompt.length / 4);
        tokensOut = json?.usage?.output_tokens || Math.ceil(rawText.length / 4);
      }

      if (!rawText.trim()) {
        await markJobFailed(
          supabaseAdmin,
          jobId,
          "PROVIDER_INVALID_RESPONSE",
          "Respuesta vacía del proveedor.",
        );
        return new Response(
          JSON.stringify({
            error_code: "PROVIDER_INVALID_RESPONSE",
            error_message: "El proveedor devolvió una respuesta vacía.",
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      try {
        const parsed = JSON.parse(rawText);
        plan = parsed.plan || { title: sanitizedPrompt, level, estimatedDurationMinutes: duration };
        blocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
      } catch {
        await markJobFailed(
          supabaseAdmin,
          jobId,
          "PROVIDER_INVALID_RESPONSE",
          "No se pudo parsear el JSON generado por el proveedor.",
        );
        return new Response(
          JSON.stringify({
            error_code: "PROVIDER_INVALID_RESPONSE",
            error_message: "Respuesta del proveedor no es un JSON válido.",
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Cancellation check before repair & final response
    if (await checkCancelled(supabaseAdmin, jobId)) {
      return new Response(
        JSON.stringify({
          error_code: "JOB_CANCELLED",
          error_message: "El trabajo de generación fue cancelado.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 8. Auto-Repair and Schema Validation of Blocks
    const repairedBlocks: unknown[] = [];
    for (const b of blocks) {
      if (typeof b === "object" && b !== null) {
        const rec = b as Record<string, unknown>;
        if (!rec.id) rec.id = crypto.randomUUID();
        if (!rec.type) rec.type = "paragraph";
        if (!rec.content_json) rec.content_json = {};
        repairedBlocks.push(rec);
      }
    }

    const durationMs = Date.now() - startTime;
    const estimatedCostVal = estimateCost(provider, model, tokensIn, tokensOut);

    // Final cancellation check before committing completion
    if (await checkCancelled(supabaseAdmin, jobId)) {
      return new Response(
        JSON.stringify({
          error_code: "JOB_CANCELLED",
          error_message: "El trabajo de generación fue cancelado.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 9. Update Job to 'completed'
    await supabaseAdmin.rpc("update_generation_job_rpc", {
      p_job_id: jobId,
      p_status: "completed",
      p_tokens_input: tokensIn,
      p_tokens_output: tokensOut,
      p_estimated_cost: estimatedCostVal,
      p_created_blocks: repairedBlocks.length,
      p_repair_count: repairCount,
      p_duration_ms: durationMs,
      p_metadata: { duration_ms: durationMs, repair_count: repairCount },
    });

    return new Response(
      JSON.stringify({
        job_id: jobId,
        plan,
        blocks: repairedBlocks,
        token_usage: {
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          total_tokens: tokensIn + tokensOut,
        },
        estimated_cost: estimatedCostVal,
        repair_count: repairCount,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errMsg = sanitizeError(err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error_code: "SERVER_ERROR", error_message: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markJobFailed(
  supabaseAdmin: ReturnType<typeof createClient>,
  jobId: string,
  errorCode: string,
  errorMessage: string,
) {
  try {
    await supabaseAdmin.rpc("update_generation_job_rpc", {
      p_job_id: jobId,
      p_status: "failed",
      p_error_code: errorCode,
      p_error_message: errorMessage,
    });
  } catch {
    // Ignore secondary RPC update failures
  }
}
