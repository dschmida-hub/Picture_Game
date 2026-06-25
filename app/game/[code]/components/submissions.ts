export type ParsedSubmission = {
  text: string;
  imageUrl: string;
  playerName: string;
  imageCaption: string;
};

export function parseSubmission(value: string): ParsedSubmission {
  const [text = "", imageUrl = "", playerName = "", imageCaption = ""] = value.split("|||");

  return {
    text,
    imageUrl,
    playerName,
    imageCaption,
  };
}
