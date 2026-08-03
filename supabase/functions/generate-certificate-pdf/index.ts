import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
      return new Response(JSON.stringify({ error: "Invalid or expired user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const { certificate_id } = await req.json();
    if (!certificate_id) {
      return new Response(JSON.stringify({ error: "Missing certificate_id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch certificate
    const { data: cert, error: certError } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("id", certificate_id)
      .single();

    if (certError || !cert) {
      return new Response(JSON.stringify({ error: "Certificate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check status: revoked or replaced are rejected for official download
    if (cert.status === "revoked" || cert.status === "replaced") {
      return new Response(
        JSON.stringify({
          error:
            "El certificado se encuentra revocado o reemplazado y no está disponible para descarga oficial.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check permissions: certificate owner or admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = Boolean(adminRole);
    if (cert.user_id !== userId && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not own this certificate" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template
    const { data: template } = await supabaseAdmin
      .from("certificate_templates")
      .select("*")
      .eq("status", "active")
      .or(`course_id.eq.${cert.course_id},is_default.eq.true`)
      .order("is_default", { ascending: true })
      .limit(1)
      .maybeSingle();

    const origin = req.headers.get("origin") || "https://ailabacademy.com";
    const verificationUrl = `${origin}/verify/${cert.verification_code}`;

    // Generate QR code data URL
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 200 });

    // Generate PDF using jsPDF server-side
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = template?.primary_color || "#0f172a";
    const secondaryColor = template?.secondary_color || "#2563eb";

    // Background border & decoration
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    doc.setDrawColor(secondaryColor);
    doc.setLineWidth(0.5);
    doc.rect(13, 13, 271, 184);

    // Title & Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(primaryColor);
    doc.text("AI LAB ACADEMY", 148.5, 35, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(secondaryColor);
    doc.text("CERTIFICADO DE FINALIZACIÓN", 148.5, 45, { align: "center" });

    // Body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#475569");
    doc.text("Se otorga el presente certificado a:", 148.5, 65, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor);
    doc.text(cert.student_name_snapshot || "Estudiante", 148.5, 80, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#475569");
    doc.text("Por haber completado satisfactoriamente el programa formativo de:", 148.5, 95, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(secondaryColor);
    doc.text(cert.course_title_snapshot || "Curso Especializado", 148.5, 110, { align: "center" });

    if (cert.instructor_name_snapshot) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor("#64748b");
      doc.text(`Instructor: ${cert.instructor_name_snapshot}`, 148.5, 122, { align: "center" });
    }

    // Dates & Certificate Numbers
    const completedDate = cert.completed_at
      ? new Date(cert.completed_at).toLocaleDateString("es-ES")
      : new Date().toLocaleDateString("es-ES");
    doc.setFontSize(10);
    doc.setTextColor("#64748b");
    doc.text(`Fecha de emisión: ${completedDate}`, 40, 150);
    doc.text(`Nº Certificado: ${cert.certificate_number}`, 40, 156);
    doc.text(`Código de verificación: ${cert.verification_code}`, 40, 162);

    // QR Code
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", 220, 135, 35, 35);
      doc.setFontSize(8);
      doc.text("Verifica la autenticidad", 237.5, 173, { align: "center" });
    }

    // Signatures
    doc.setDrawColor("#cbd5e1");
    doc.line(110, 160, 180, 160);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text(template?.signature_name || "Dirección Académica", 145, 166, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#64748b");
    doc.text(template?.signature_title || "AI Lab Academy", 145, 171, { align: "center" });

    // Output PDF ArrayBuffer
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

    const storagePath = `${cert.user_id}/${cert.id}.pdf`;

    // Upload to private bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from("certificates")
      .upload(storagePath, pdfUint8Array, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload certificate PDF to storage" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Update pdf_path in certificates table using service role
    await supabaseAdmin
      .from("certificates")
      .update({ pdf_path: storagePath, updated_at: new Date().toISOString() })
      .eq("id", cert.id);

    // Record pdf_generated event via secure RPC
    await supabaseAdmin.rpc("record_certificate_event", {
      p_certificate_id: cert.id,
      p_event_type: "pdf_generated",
      p_actor_user_id: userId,
      p_metadata_json: { pdf_path: storagePath },
    });

    // Create temporary signed URL (valid for 3600 seconds)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("certificates")
      .createSignedUrl(storagePath, 3600);

    if (signedError || !signedData) {
      return new Response(JSON.stringify({ error: "Failed to generate signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        pdf_path: storagePath,
        signed_url: signedData.signedUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
