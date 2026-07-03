import { HelpTooltip } from "./HelpTooltip";
import type { BonusAwardSubmission, ContentRating, Player, RoundHistoryItem, ScoreboardPlayer } from "./types";

type ConfettiPiece = {
  color: string;
  delay: string;
  left: string;
  rotation: string;
};

type WinnerScreenProps = {
  code: string;
  confettiPieces: ConfettiPiece[];
  winnerImages: string[];
  winnerName: string;
  winnerPrompt: string;
  winner: string;
  players: Player[];
  scoreboardPlayers: ScoreboardPlayer[];
  finalWinner: string;
  roundHistory: RoundHistoryItem[];
  bonusAwardSubmissions: BonusAwardSubmission[];
  roundSubmissions: BonusAwardSubmission[];
  contentRating: ContentRating;
  isHost: boolean;
  hostName?: string;
  isPlayingAgain: boolean;
  isAdvancing: boolean;
  onPlayAgain: () => void;
  onNextRound: () => void;
  onReturnToLobby: () => void;
};

function normalizeName(playerName?: string | null) {
  return (playerName || "").trim().toLowerCase();
}

function EmptyAvatar() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-rose-100 text-sm font-black text-rose-800">
      ?
    </div>
  );
}

type BonusAward = {
  title: string;
  playerName: string;
  reason: string;
};

type AwardRule = {
  title: string;
  reason: string;
  pattern: RegExp;
};

const everyoneAwardRules: AwardRule[] = [
  {
    title: "Animal Control MVP",
    reason: "somehow made it about animals again",
    pattern: /\b(raccoon|dog|cat|goose|bird|alligator|bear|horse|hamster|squirrel|fish|frog|cow|chicken|duck)\b/gi,
  },
  {
    title: "Snack Crime Specialist",
    reason: "can't answer without a side of fries",
    pattern: /\b(pizza|taco|sandwich|hot dog|cake|cookie|cheese|burger|fries|snack|spaghetti|soup|cereal)\b/gi,
  },
  {
    title: "Drama Department Chair",
    reason: "turned a prompt into a full theatrical breakdown",
    pattern: /\b(scream|cry|panic|dramatic|betrayal|wedding|funeral|explosion|chaos|disaster|yell)\b/gi,
  },
  {
    title: "Grandma Lore Keeper",
    reason: "keeps bringing the whole family into this",
    pattern: /\b(grandma|grandpa|aunt|uncle|cousin|family|reunion|dad)\b/gi,
  },
  {
    title: "Vehicular Mayhem Chief",
    reason: "every answer ends in a high-speed chase",
    pattern: /\b(car|truck|plane|airplane|boat|rocket|bike|bicycle|train|scooter|helicopter|submarine)\b/gi,
  },
  {
    title: "Certified Natural Disaster",
    reason: "personally responsible for the weather today",
    pattern: /\b(tornado|hurricane|earthquake|volcano|blizzard|meteor|tsunami|avalanche|lightning|flood)\b/gi,
  },
  {
    title: "Backyard Superhero",
    reason: "self-appointed defender of the neighborhood",
    pattern: /\b(superhero|villain|cape|mask|superpower|superpowers|laser|sidekick|nemesis)\b/gi,
  },
  {
    title: "Monster Mash Liaison",
    reason: "on a first-name basis with every cryptid in town",
    pattern: /\b(robot|alien|zombie|ghost|monster|ufo|dinosaur|dragon|vampire|werewolf)\b/gi,
  },
];

const pg13AwardRules: AwardRule[] = [
  {
    title: "Potty Mouth Laureate",
    reason: "earned a PhD in bathroom humor",
    pattern: /\b(poop|poops|pooped|pooping|toilet|fart|farts|farting|pee|peed|peeing|butt|butts)\b/gi,
  },
  {
    title: "Certified Mom Mentioner",
    reason: "can't answer without dragging mom into it",
    pattern: /\b(mom|mommy|mother|mothers|mother-in-law|your mom|my mom)\b/gi,
  },
  {
    title: "Questionable Life Choices Award",
    reason: "living their absolute worst best life",
    pattern: /\b(drunk|hangover|beer|wine|bar|dating|date|kiss|crush|ex|hot tub|regret)\b/gi,
  },
  {
    title: "Roast Goblin",
    reason: "never met an insult they didn't love",
    pattern: /\b(loser|idiot|dummy|dumb|gross|stupid|weird|creepy|awkward|terrible)\b/gi,
  },
  {
    title: "Group Chat Menace",
    reason: "left everyone on read with zero regrets",
    pattern: /\b(text|texting|dm|snap|snapchat|block|blocked|ghosted|group chat)\b/gi,
  },
  {
    title: "Reality TV Villain",
    reason: "here for the drama, not the friendship",
    pattern: /\b(scandal|messy|petty|toxic|receipts|shady|villain arc|cancelled)\b/gi,
  },
  {
    title: "Group Project Nightmare",
    reason: "deadline-induced meltdown, right on schedule",
    pattern: /\b(deadline|boss|fired|quit|meeting|overtime|spreadsheet|coworker)\b/gi,
  },
  {
    title: "Gym Bro Energy",
    reason: "it's always leg day in this answer",
    pattern: /\b(gains|protein|deadlift|flex|six pack|leg day|bench press|pre-workout)\b/gi,
  },
];

function countMatches(text: string, pattern: RegExp) {
  pattern.lastIndex = 0;
  return text.match(pattern)?.length || 0;
}

function getFinalWinnerNames(finalWinner: string) {
  return finalWinner
    .replace(/^Tie:\s*/i, "")
    .split(/\s+and\s+|,/i)
    .map((name) => normalizeName(name))
    .filter(Boolean);
}

function buildAwards({
  candidateNames,
  contentRating,
  limit,
  submissions,
}: {
  candidateNames: string[];
  contentRating: ContentRating;
  limit: number;
  submissions: BonusAwardSubmission[];
}) {
  if (candidateNames.length === 0 || submissions.length === 0) return [];

  const candidateSet = new Set(candidateNames.map(normalizeName));

  const submissionsByPlayer = submissions.reduce<Record<string, string[]>>((groups, submission) => {
    const normalizedName = normalizeName(submission.player_name);
    if (!candidateSet.has(normalizedName)) return groups;

    groups[normalizedName] = groups[normalizedName] || [];
    groups[normalizedName].push(submission.prompt || "");
    return groups;
  }, {});
  const rules = contentRating === "pg13" ? pg13AwardRules : everyoneAwardRules;
  const usedPlayers = new Set<string>();
  const awards: BonusAward[] = [];

  for (const rule of rules) {
    const winnerForRule = candidateNames
      .map((playerName) => {
        const normalizedName = normalizeName(playerName);
        const score = countMatches((submissionsByPlayer[normalizedName] || []).join(" "), rule.pattern);
        return { playerName, normalizedName, score };
      })
      .filter((candidate) => candidate.score > 0 && !usedPlayers.has(candidate.normalizedName))
      .sort((first, second) => second.score - first.score)[0];

    if (!winnerForRule) continue;

    usedPlayers.add(winnerForRule.normalizedName);
    awards.push({
      title: rule.title,
      playerName: winnerForRule.playerName,
      reason: rule.reason,
    });

    if (awards.length >= limit) break;
  }

  if (awards.length > 0) return awards;

  return candidateNames.slice(0, limit).map((playerName) => ({
    title: "Chaos Participation Trophy",
    playerName,
    reason: "survived the image machine without winning",
  }));
}

export function WinnerScreen({
  code,
  confettiPieces,
  winnerImages,
  winnerName,
  winnerPrompt,
  winner,
  players,
  scoreboardPlayers,
  finalWinner,
  roundHistory,
  bonusAwardSubmissions,
  roundSubmissions,
  contentRating,
  isHost,
  hostName,
  isPlayingAgain,
  isAdvancing,
  onPlayAgain,
  onNextRound,
  onReturnToLobby,
}: WinnerScreenProps) {
  function findPlayerAvatar(playerName?: string | null) {
    const normalizedName = normalizeName(playerName);
    if (!normalizedName) return null;

    return players.find((player) => normalizeName(player.name) === normalizedName)?.avatar_url || null;
  }

  const safeWinnerName = winnerName || "";
  const winnerNames = safeWinnerName.startsWith("Tie: ")
    ? safeWinnerName.replace("Tie: ", "").split(" and ").map((name) => name.trim()).filter(Boolean)
    : safeWinnerName
      ? [safeWinnerName]
      : [];
  const winnerAvatars = winnerNames
    .map((name) => ({ name, avatarUrl: findPlayerAvatar(name) }))
    .filter((winnerAvatar) => winnerAvatar.avatarUrl);
  const galleryUrl = `/game/${code}/gallery`;
  const winnerNameSet = new Set(winnerNames.map(normalizeName));

  const finalWinnerNames = getFinalWinnerNames(finalWinner);
  const finalBonusAwards = finalWinner
    ? buildAwards({
        candidateNames: scoreboardPlayers
          .map((player) => player.name)
          .filter((playerName) => !finalWinnerNames.includes(normalizeName(playerName))),
        contentRating,
        limit: 3,
        submissions: bonusAwardSubmissions,
      })
    : [];

  const roundBonusAwards = !finalWinner
    ? buildAwards({
        candidateNames: Array.from(
          new Set(
            roundSubmissions
              .map((submission) => submission.player_name)
              .filter((playerName) => !winnerNameSet.has(normalizeName(playerName)))
          )
        ),
        contentRating,
        limit: 1,
        submissions: roundSubmissions,
      })
    : [];

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
        {confettiPieces.map((piece, index) => (
          <span
            key={index}
            className="absolute"
            style={{
              animation: "confetti-fall 2.8s ease-in infinite",
              animationDelay: piece.delay,
              backgroundColor: piece.color,
              height: "16px",
              left: piece.left,
              top: "-24px",
              transform: `rotate(${piece.rotation})`,
              width: "10px",
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-6 text-center text-zinc-950 shadow-[8px_8px_0_#111827]">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-rose-700">Results</p>
        <h2 className="mb-4 text-4xl font-black">
          {winnerImages.length > 1 ? "Tie Winners" : "Round Winner"}
        </h2>

        <div className={`mb-5 grid gap-4 ${winnerImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {winnerImages.map((imageUrl, index) => (
            <img
              key={index}
              src={imageUrl}
              alt="Winning image"
              className="aspect-square w-full rounded-2xl border-2 border-black object-cover"
            />
          ))}
        </div>

        <div className="relative rounded-2xl border-2 border-black bg-rose-50 p-4 text-black">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-black bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider">
            Winner
          </div>

          {winnerAvatars.length > 0 && (
            <div className="mb-3 mt-4 flex justify-center">
              <div className="flex -space-x-3">
                {winnerAvatars.map((winnerAvatar) => (
                  <img
                    key={winnerAvatar.name}
                    src={winnerAvatar.avatarUrl || ""}
                    alt={winnerAvatar.name}
                    title={winnerAvatar.name}
                    className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-3xl font-black">{winnerName || "Calculating..."}</p>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            {winnerImages.length > 1 ? "tied for the round" : "won the round"}
          </p>
          <p className="mt-4 text-lg font-black">{`"${winnerPrompt || winner}"`}</p>
        </div>

        {roundBonusAwards.length > 0 && (
          <div className="mt-5 rounded-2xl border-2 border-black bg-amber-50 p-4">
            {roundBonusAwards.map((award) => {
              const avatarUrl = findPlayerAvatar(award.playerName);

              return (
                <div key={`${award.title}-${award.playerName}`} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-black bg-white text-lg font-black">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={award.playerName} className="h-full w-full object-cover" />
                    ) : (
                      "?"
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-wider text-rose-700">{award.title}</p>
                    <p className="text-lg font-black">
                      {award.playerName}
                      <span className="ml-2 text-xs font-bold text-zinc-600">{award.reason}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 shadow-[8px_8px_0_#111827]">
        <div className="mb-4 flex items-center justify-center gap-2">
          <h3 className="text-center text-3xl font-black">Scoreboard</h3>
          <HelpTooltip text="Scores update after each round. First player to 3 points wins the game." />
        </div>

        <div className="flex flex-col gap-3">
          {scoreboardPlayers.map((player, index) => (
            <div
              key={player.name}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 font-black ${
                index === 0
                  ? "border-2 border-black bg-amber-100 text-amber-950"
                  : "border border-sky-200 bg-sky-100 text-sky-950"
              }`}
            >
              <div className="flex items-center gap-3">
                {player.avatar_url ? (
                  <div className="relative">
                    <img
                      src={player.avatar_url}
                      alt={player.name}
                      className="h-12 w-12 rounded-full border-2 border-black object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full border border-black bg-amber-300 px-1.5 text-[10px] font-black">
                        1
                      </span>
                    )}
                  </div>
                ) : (
                  <EmptyAvatar />
                )}

                <div className="min-w-0 text-left">
                  <p className="truncate">{player.name}</p>
                  <p className="text-xs font-bold opacity-70">{index === 0 ? "Current leader" : `Place ${index + 1}`}</p>
                </div>
              </div>

              <span className="rounded-full border border-black bg-white px-3 py-1">{player.points ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {roundHistory.length > 0 && (
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-2xl font-black">Share the chaos</h3>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            Send friends the recap gallery for this room.
          </p>
          <a
            href={galleryUrl}
            className="mt-4 block rounded-2xl bg-zinc-950 px-6 py-4 font-black text-white shadow-[4px_4px_0_#fb7185]"
          >
            Open Share Gallery
          </a>
        </div>
      )}

      {finalWinner && (
        <div className="max-w-4xl rounded-[2rem] border-2 border-black bg-amber-100 p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-3xl font-black">Final Winner</h3>
          <p className="mt-2 text-xl font-black">{finalWinner}</p>

          {finalBonusAwards.length > 0 && (
            <div className="mt-6 rounded-[2rem] border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_#111827]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">
                Consolation chaos awards
              </p>
              <h4 className="mt-1 text-2xl font-black">Nobody leaves empty-handed</h4>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {finalBonusAwards.map((award) => {
                  const avatarUrl = findPlayerAvatar(award.playerName);

                  return (
                    <div key={`${award.title}-${award.playerName}`} className="rounded-2xl border-2 border-black bg-rose-50 p-4 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-black bg-white text-xl font-black">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={award.playerName} className="h-full w-full object-cover" />
                        ) : (
                          "?"
                        )}
                      </div>
                      <p className="text-sm font-black uppercase tracking-wider text-rose-700">{award.title}</p>
                      <p className="mt-1 text-xl font-black">{award.playerName}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-600">{award.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h4 className="mb-4 text-2xl font-black">Round History</h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roundHistory.map((round) => {
                const roundWinnerName = round.winner_name || "Unknown winner";
                const roundWinnerAvatar = findPlayerAvatar(round.winner_name);
                const displayImage = round.gallery_thumbnail_url || round.winner_image_url;

                return (
                  <div key={round.id} className="rounded-2xl border-2 border-black bg-white p-3 text-black shadow-[4px_4px_0_#111827]">
                    <p className="mb-2 font-black">Round {round.round_number}</p>

                    {displayImage && (
                      <img
                        src={displayImage}
                        alt={round.winner_prompt}
                        className="mb-2 aspect-square w-full rounded-xl object-cover"
                      />
                    )}

                    <div className="flex items-center justify-center gap-2 font-black">
                      {roundWinnerAvatar && (
                        <img
                          src={roundWinnerAvatar}
                          alt={roundWinnerName}
                          className="h-8 w-8 rounded-full border-2 border-amber-300 object-cover"
                        />
                      )}
                      <span>{roundWinnerName}</span>
                    </div>
                    <p className="text-sm font-bold text-zinc-600">{`"${round.winner_prompt}"`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {finalWinner && isHost && (
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-2xl font-black">Start a fresh game?</h3>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            This keeps the same room and players, but resets everyone&apos;s score.
          </p>
          <button
            type="button"
            onClick={onPlayAgain}
            disabled={isPlayingAgain}
            title="Reset scores and start a fresh match with the same room."
            className="mt-4 w-full rounded-2xl bg-rose-600 px-8 py-4 font-black text-white shadow-[4px_4px_0_#111827] disabled:opacity-50"
          >
            {isPlayingAgain ? "Resetting Game..." : "Rematch in This Room"}
          </button>
        </div>
      )}

      {finalWinner && !isHost && (
        <p className="text-center font-bold text-zinc-500">
          Waiting for {hostName || "the host"} to start a rematch...
        </p>
      )}

      {!finalWinner && isHost && (
        <div className="w-full max-w-md rounded-[2rem] border-2 border-black bg-white p-5 text-center shadow-[8px_8px_0_#111827]">
          <h3 className="text-2xl font-black">Keep the game moving</h3>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            Start another round, or return to the lobby to change settings.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={onNextRound}
              disabled={isAdvancing}
              title="Start the next round with a new prompt."
              className="rounded-2xl bg-rose-600 px-6 py-4 font-black text-white shadow-[4px_4px_0_#111827] disabled:opacity-50"
            >
              {isAdvancing ? "Starting..." : "Next Round"}
            </button>
            <button
              type="button"
              onClick={onReturnToLobby}
              disabled={isAdvancing}
              title="Return to lobby to change settings or wait for players."
              className="rounded-2xl border-2 border-black bg-white px-6 py-4 font-black text-zinc-950 disabled:opacity-50"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {!finalWinner && !isHost && (
        <p className="text-center font-bold text-zinc-500">
          Waiting for {hostName || "the host"} to start the next round...
        </p>
      )}
    </>
  );
}
