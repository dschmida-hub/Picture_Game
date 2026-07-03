import { supabaseAdmin } from "@/app/api/_utils/api";

export async function getRolling24HourSpendCents() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select("estimated_image_cost_cents")
    .not("image_url", "is", null)
    .gte("created_at", since);

  if (error) throw error;

  return (data || []).reduce(
    (sum, submission) => sum + Number(submission.estimated_image_cost_cents || 0),
    0
  );
}
