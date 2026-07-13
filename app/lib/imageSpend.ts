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

// Atomically checks the rolling spend cap and, if there's room, reserves
// the estimated cost before generation starts - closes the TOCTOU race
// where concurrent requests all read the same pre-generation total (see
// atomic_image_spend_cap.sql). Returns the reservation id to release
// afterward, or null if the cap would be exceeded.
export async function reserveImageSpend({
  roomCode,
  estimatedCents,
  maxDailyCents,
}: {
  roomCode: string;
  estimatedCents: number;
  maxDailyCents: number;
}): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc("reserve_image_spend", {
    room_code_input: roomCode,
    estimated_cents_input: estimatedCents,
    max_daily_cents_input: maxDailyCents,
  });

  if (error) throw error;
  return data ?? null;
}

export async function releaseImageSpendReservation(reservationId: number | null) {
  if (!reservationId) return;

  const { error } = await supabaseAdmin.rpc("release_image_spend_reservation", {
    reservation_id_input: reservationId,
  });

  if (error) console.error("Failed to release image spend reservation:", error);
}
