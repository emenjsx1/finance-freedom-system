import { supabase } from "@/integrations/supabase/client";

export type SignedInDestination = "/app" | "/onboarding";

/**
 * New accounts complete the short setup first. Existing accounts return
 * directly to the app based on their cloud-backed setup state.
 */
export async function getSignedInDestination(): Promise<SignedInDestination> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return "/onboarding";

  const { data, error } = await supabase
    .from("user_settings")
    .select("onboarding_completed")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return "/app";
  return data?.onboarding_completed ? "/app" : "/onboarding";
}