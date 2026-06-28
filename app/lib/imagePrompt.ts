type PromptPlayer = {
  name: string;
  avatar_description: string | null;
};

const imageStyleInstructions: Record<string, string> = {
  cartoon: "Bright, colorful cartoon illustration with big expressive faces",
  comic_book: "Dynamic comic-book art with bold ink outlines and dramatic color",
  clay_animation: "Playful handcrafted clay-animation style with soft studio lighting",
  storybook: "Whimsical illustrated storybook art with rich, charming detail",
  pixel_art: "Detailed retro pixel-art scene with expressive characters",
};

function getImageStyleInstruction(style: string | null) {
  return imageStyleInstructions[style || "cartoon"] || imageStyleInstructions.cartoon;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function doesTextMentionName(text: string, playerName: string) {
  const trimmedName = playerName.trim();
  if (trimmedName.length < 2) return false;

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(trimmedName.toLowerCase())}([^a-z0-9]|$)`, "i");
  return pattern.test(text.toLowerCase());
}

function buildPlayerAppearanceContext(players: PromptPlayer[], currentPlayerName: string, answer: string) {
  const trimmedAnswer = answer.trim();
  const currentPlayer = players.find((player) => player.name === currentPlayerName);
  const namedPlayers = players.filter((player) => doesTextMentionName(trimmedAnswer, player.name));
  const mentionsSelf = /\b(i|me|my|mine|myself)\b/i.test(trimmedAnswer);
  const relevantPlayers = [...namedPlayers];

  if (mentionsSelf && currentPlayer && !relevantPlayers.some((player) => player.name === currentPlayer.name)) {
    relevantPlayers.push(currentPlayer);
  }

  const playersToDescribe = relevantPlayers;

  if (playersToDescribe.length === 0) {
    return "No specific player appearance is requested. Do not use any player's avatar or likeness. Use generic funny characters only.";
  }

  return playersToDescribe
    .map((player) => `${player.name}: ${player.avatar_description || "Generic person"}`)
    .join("\n");
}

function shouldAllowVisibleText(answer: string) {
  return /\b(sign|banner|poster|billboard|label|note|letter|card|shirt|t-shirt|slogan|speech bubble|word bubble|reads|written|writing|text|logo)\b/i.test(
    answer
  );
}

export function buildImagePrompt({
  answer,
  roundPrompt,
  imageStyle,
  players,
  playerName,
}: {
  answer: string;
  roundPrompt: string;
  imageStyle: string | null;
  players: PromptPlayer[];
  playerName: string;
}) {
  const playerAppearanceContext = buildPlayerAppearanceContext(players, playerName, answer);
  const visibleTextInstruction = shouldAllowVisibleText(answer)
    ? `Visible text rule:
The player's answer appears to ask for visible text. You may include ONE tiny piece of readable text only if it is essential to the joke.
- Never use text from the round prompt/question.
- Never copy the full player answer into the image.
- Use at most 1-5 words.
- Put it on one obvious object only, such as a sign, shirt, note, banner, or single speech bubble.
- Do not add background writing, captions, subtitles, labels, logos, UI text, or random fake letters.`
    : `Visible text rule:
ABSOLUTELY NO READABLE TEXT ANYWHERE IN THE IMAGE.
Do not draw words, letters, captions, subtitles, labels, signs, posters, banners, logos, UI text, speech bubbles, fake writing, gibberish writing, or text-like marks.
Communicate the joke only through characters, props, expressions, action, and composition.`;

  return `
Create one hilarious party game image.

${visibleTextInstruction}

The round prompt/question is private context only. Never write, quote, paraphrase, label, or display the round prompt/question anywhere in the image.

Private scene context, for inspiration only:
- Private round prompt/question, NEVER visible as text: ${roundPrompt}
- Private player punchline, use as scene inspiration: ${answer}

Relevant Player Appearances:
${playerAppearanceContext}

If a player name is mentioned in the answer, use that named player's appearance for that character.
Only use the submitting player's appearance when the answer explicitly refers to them directly with words like I, me, my, mine, or myself. If no player is named or directly referenced, do not use player avatars; use generic funny characters.

Turn the scene context into a single funny visual moment.

The image should clearly show the connection between the question and answer.
The answer should be the main punchline, but the joke should be understandable without reading the answer.
Do not simply show the answer by itself.

Style rules:

The image should:
- Make players laugh within 3 seconds.
- Show one clear visual joke.
- Be immediately understandable.
- Use bright, colorful cartoon styling.
- Have big expressive faces and exaggerated reactions.
- Focus on one main subject and one funny moment.
- Show the consequences of the joke whenever possible.
- Prefer literal interpretations of metaphors and expressions.
- Add small background reactions only if they support the main joke.
- Communicate all humor visually through characters, props, expressions, and action.

Never include:
- Captions
- Subtitles
- The round prompt/question as text
- Words copied from the round prompt/question
- Extra labels
- Extra signs
- Posters
- Logos
- Fake letters, gibberish, subtitles, UI text, or random background writing.
- Speech bubbles unless the visible text rule above explicitly allows it.

Avoid:
- Crowded scenes
- Complex stories
- Multiple unrelated jokes
- Realistic photography
- Empty backgrounds
- Confusing compositions

The final image should feel like a frame from an animated comedy movie.

${getImageStyleInstruction(imageStyle)}
Create a hilarious cartoon image based on the player's answer.
`;
}
