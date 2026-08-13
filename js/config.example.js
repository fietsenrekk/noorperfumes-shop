/* Copy this file to js/config.js and fill in your Supabase project values.
   BOTH of these are PUBLIC (safe to ship to the browser):
     - the project URL
     - the ANON (publishable) key  — NOT the service_role key, never that one.
   The service_role and Mollie keys live only in Supabase Edge Function secrets. */

window.NOOR_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT-ref.supabase.co",
  supabaseAnonKey: "YOUR-ANON-PUBLIC-KEY",
  // Base URL of your deployed Edge Functions (usually supabaseUrl + /functions/v1)
  functionsUrl: "https://YOUR-PROJECT-ref.supabase.co/functions/v1"
};
