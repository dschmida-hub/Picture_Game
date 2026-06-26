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

  const playersToDescribe = relevantPlayers.length > 0 ? relevantPlayers : currentPlayer ? [currentPlayer] : [];

  if (playersToDescribe.length === 0) {
    return "No specific player appearance is available. Use a generic funny character.";
  }

  return playersToDescribe
    .map((player) => `${player.name}: ${player.avatar_description || "Generic person"}`)
    .join("\n");
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

  return `
Create one hilarious party game image.

Default text rule: do not put readable or fake text in the image.

The round prompt/question is private context only. Never write, quote, paraphrase, label, or display the round prompt/question anywhere in the image.

Exception: if the player's punchline clearly asks for visible words, a sign, a note, a label, a shirt slogan, a banner, or a speech bubble, you may include one short piece of readable text because it is part of the joke.

This exception applies only to the player's punchline. It never applies to the round prompt/question.

If text is included:
- Use only the exact words needed for the joke.
- Keep it very short, ideally 1-5 words.
- Put it on one obvious object like a sign, shirt, note, banner, or single speech bubble.
- Make the letters clean and readable.
- Do not add any extra text.

Private scene context, for inspiration only:
- Round prompt/question, never visible as text: ${roundPrompt}
- Player punchline, may be visible as text only if the punchline itself asks for it: ${answer}

Relevant Player Appearances:
${playerAppearanceContext}

If a player name is mentioned in the answer, use that named player's appearance for that character.
Only use the submitting player's appearance when the answer refers to them directly or no other player is named.

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
- The round prompt/question as text
- Words copied from the round prompt/question
- Extra labels
- Extra signs
- Posters
- Logos
- Fake letters, gibberish, subtitles, UI text, or random background writing.
- Speech bubbles unless the player's punchline specifically asks for someone to say something.

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
