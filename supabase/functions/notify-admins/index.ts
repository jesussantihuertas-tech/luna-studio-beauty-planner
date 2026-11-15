
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response("No autorizado", { status: 401, headers: cors });
    }

    const { appointment_id } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: appointment, error: apptError } = await admin
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .eq("client_id", user.id)
      .single();

    if (apptError || !appointment) {
      return new Response("Solicitud no encontrada", { status: 404, headers: cors });
    }

    const { data: admins } = await admin
      .from("profiles")
      .select("expo_push_token")
      .eq("role", "admin")
      .not("expo_push_token", "is", null);

    const messages = (admins || []).filter(x => x.expo_push_token).map(x => ({
      to: x.expo_push_token,
      sound: "default",
      title: "♡ Nueva solicitud de cita",
      body: `${appointment.client_name} · ${appointment.service} · ${appointment.appointment_date} ${appointment.appointment_time}`,
      data: { appointment_id: appointment.id }
    }));

    if (messages.length) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(messages)
      });
    }

    return new Response(JSON.stringify({ sent: messages.length }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
