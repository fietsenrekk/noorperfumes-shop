// Shared CORS headers. In production, lock ALLOW_ORIGIN to your real domain
// via the ALLOWED_ORIGIN env var (e.g. https://noorperfumes.be).
const allowed = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowed,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
