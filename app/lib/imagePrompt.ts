type PromptPlayer = {
  name: string;
  avatar_description: string | null;
};

type ContentRating = "everyone" | "pg13";

const imageStyleInstructions: Record<string, string> = {
  cartoon: "Bright, colorful cartoon illustration with big expressive faces",
  comic_book: "Dynamic comic-book art with bold ink outlines and dramatic color",
  clay_animation: "Playful handcrafted clay-animation style with soft studio lighting",
  storybook: "Whimsical illustrated storybook art with rich, charming detail",
  pixel_art: "Detailed retro pixel-art scene with expressive characters",
  puppet_show: "Handmade puppet show scene with felt, fabric, cardboard props, visible stage lighting, and charming theatrical staging",
  childrens_picture_book: "Children's picture book illustration with warm watercolor textures, soft ink outlines, cozy colors, and expressive storybook characters",
  lego_stop_motion: "Toy brick stop-motion scene made from colorful plastic building blocks and minifigure-like characters, with playful handmade animation energy and no logos",
  minecraft: "Blocky voxel sandbox-game world with cube-shaped characters, chunky pixel textures, square props, and playful grid-based scenery with no logos",
  renaissance_painting: "Renaissance oil painting style with dramatic chiaroscuro lighting, rich fabric textures, classical composition, expressive poses, and museum-quality brushwork",
};

function normalizeImageStyle(style: string | null | undefined) {
  const normalizedStyle = (style || "clay_animation")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliases: Record<string, string> = {
    colorful_cartoon: "cartoon",
    claymation: "clay_animation",
    clay: "clay_animation",
    children_picture_book: "childrens_picture_book",
    childrens_book: "childrens_picture_book",
    childrens_picturebook: "childrens_picture_book",
    lego: "lego_stop_motion",
    lego_stopmotion: "lego_stop_motion",
    renaissance: "renaissance_painting",
  };

  return aliases[normalizedStyle] || normalizedStyle || "clay_animation";
}

function getImageStyleInstruction(style: string | null) {
  return imageStyleInstructions[normalizeImageStyle(style)] || imageStyleInstructions.clay_animation;
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
  contentRating = "everyone",
  roundPrompt,
  imageStyle,
  players,
  playerName,
}: {
  answer: string;
  contentRating?: ContentRating;
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
  const contentRatingInstruction =
    contentRating === "pg13"
      ? `Humor rating:
PG-13 party mode: crude, roast-heavy, and a little unhinged. Bathroom humor, savage roasts, awkward family drama, sexual innuendo, embarrassing dating/hookup mishaps, drinking-related chaos, and gross-out slapstick are all fair game. Push the joke as far as it can go while staying suggestive rather than explicit.
Hard limits, no exceptions: no nudity, no explicit sexual content, no fetish content, real injury, gore, hate speech, or targeted harassment of real people.`
      : `Humor rating:
Everyone mode. Keep the image clean, silly, and broadly family-friendly.
Avoid bathroom humor, sexual innuendo, alcohol/drug references, profanity, graphic gross-out material, hate, real injury, or scary/disturbing imagery.`;

  return `
Create one hilarious party game image.

${visibleTextInstruction}

${contentRatingInstruction}

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
- Follow the selected visual style exactly.
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

The final image should feel like a polished frame from a visual comedy scene.

${getImageStyleInstruction(imageStyle)}
Create a hilarious image based on the player's answer.
`;
}
