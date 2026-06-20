// Lovable integration — Cloud Auth helper
// NOTE: Google Sign-In now uses Supabase native OAuth directly (see Auth.tsx).
// This module remains for other Lovable API calls (AI gateway, etc.) if needed.

import { createClient } from "@lovable.dev/cloud-auth-js";

export const lovable = createClient();
