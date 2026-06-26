export type ParsedSubmission = {
  id: number | null;
  text: string;
  imageUrl: string;
  thumbnailUrl: string;
  playerName: string;
  imageCaption: string;
};

export function parseSubmission(value: string): ParsedSubmission {
  const [
    id = "",
    text = "",
    imageUrl = "",
    playerName = "",
    imageCaption = "",
    thumbnailUrl = "",
  ] = value.split("|||");
  const parsedId = Number(id);

  return {
    id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null,
    text,
    imageUrl,
    thumbnailUrl,
    playerName,
    imageCaption,
  };
}
