import { supabaseAdmin } from "../../_utils/api";

// Loops over up to 50 rooms doing storage + DB deletes; give it real
// headroom rather than the 10s platform default.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;
const MAX_ROOMS_PER_RUN = 50;

type StaleRoomRow = { room_code: string };
type PlayerAvatarRow = { avatar_url: string | null };
type SubmissionImageRow = { image_url: string | null; gallery_thumbnail_url: string | null };
type RoundHistoryUrlRow = { winner_image_url: string | null; gallery_thumbnail_url: string | null };

function extractStoragePath(url: string | null | undefined, bucket: string) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleRooms, error: staleRoomsError } = await supabaseAdmin.rpc("find_stale_rooms", {
    cutoff,
    max_rooms: MAX_ROOMS_PER_RUN,
  });

  if (staleRoomsError) {
    console.error("Storage retention cleanup: failed to find stale rooms:", staleRoomsError);
    return Response.json({ error: "Failed to find stale rooms" }, { status: 500 });
  }

  const roomCodes = ((staleRooms as StaleRoomRow[]) || []).map((row) => row.room_code);

  if (roomCodes.length === 0) {
    return Response.json({ roomsPurged: 0, storageObjectsDeleted: 0 });
  }

  // round_history (the homepage showcase) is retained indefinitely and
  // curated manually via /admin/showcase - never delete a storage object
  // one of its rows still points to, even if the owning room is stale.
  const { data: protectedRows, error: protectedError } = await supabaseAdmin
    .from("round_history")
    .select("winner_image_url, gallery_thumbnail_url");

  if (protectedError) {
    console.error("Storage retention cleanup: failed to load showcase URLs:", protectedError);
    return Response.json({ error: "Failed to load showcase URLs" }, { status: 500 });
  }

  const protectedUrls = new Set<string>();
  for (const row of (protectedRows as RoundHistoryUrlRow[]) || []) {
    if (row.winner_image_url) protectedUrls.add(row.winner_image_url);
    if (row.gallery_thumbnail_url) protectedUrls.add(row.gallery_thumbnail_url);
  }

  let storageObjectsDeleted = 0;
  let storageDeleteFailures = 0;
  let roomsPurged = 0;

  for (const roomCode of roomCodes) {
    const [{ data: players }, { data: submissions }] = await Promise.all([
      supabaseAdmin.from("players").select("avatar_url").eq("room_code", roomCode),
      supabaseAdmin.from("submissions").select("image_url, gallery_thumbnail_url").eq("room_code", roomCode),
    ]);

    const avatarPaths = ((players as PlayerAvatarRow[]) || [])
      .map((player) => extractStoragePath(player.avatar_url, "avatars"))
      .filter((path): path is string => Boolean(path));

    const imagePaths = ((submissions as SubmissionImageRow[]) || [])
      .flatMap((submission) => [submission.image_url, submission.gallery_thumbnail_url])
      .filter((url): url is string => Boolean(url))
      .filter((url) => !protectedUrls.has(url))
      .map((url) => extractStoragePath(url, "game-images"))
      .filter((path): path is string => Boolean(path));

    if (avatarPaths.length > 0) {
      const { error } = await supabaseAdmin.storage.from("avatars").remove(avatarPaths);
      if (error) {
        console.error(`Storage retention cleanup: failed to delete avatars for room ${roomCode}:`, error);
        storageDeleteFailures += avatarPaths.length;
      } else {
        storageObjectsDeleted += avatarPaths.length;
      }
    }

    if (imagePaths.length > 0) {
      const { error } = await supabaseAdmin.storage.from("game-images").remove(imagePaths);
      if (error) {
        console.error(`Storage retention cleanup: failed to delete images for room ${roomCode}:`, error);
        storageDeleteFailures += imagePaths.length;
      } else {
        storageObjectsDeleted += imagePaths.length;
      }
    }

    const { error: purgeError } = await supabaseAdmin.rpc("purge_stale_room", {
      room_code_input: roomCode,
    });

    if (purgeError) {
      console.error(`Storage retention cleanup: failed to purge DB rows for room ${roomCode}:`, purgeError);
      continue;
    }

    roomsPurged += 1;
  }

  console.log(
    `Storage retention cleanup: purged ${roomsPurged}/${roomCodes.length} rooms older than ${RETENTION_DAYS} days, deleted ${storageObjectsDeleted} storage objects (${storageDeleteFailures} failures).`
  );

  return Response.json({
    roomsPurged,
    roomCodesConsidered: roomCodes,
    storageObjectsDeleted,
    storageDeleteFailures,
  });
}
