import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const now = new Date();
const heartbeatPayload = {
  updated_at_utc: now.toISOString(),
  hour_utc: now.getUTCHours(),
  source: "github-actions-cron",
};

const { error } = await supabase.from("app_settings").upsert(
  [
    {
      setting_key: "system.supabase_keepalive",
      setting_value: JSON.stringify(heartbeatPayload),
      encrypted: false,
    },
  ],
  { onConflict: "setting_key" },
);

if (error) {
  console.error("Failed to write keepalive heartbeat:", error.message);
  process.exit(1);
}

console.log(
  `Supabase keepalive heartbeat updated at ${heartbeatPayload.updated_at_utc}`,
);
