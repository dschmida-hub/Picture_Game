type JoinRoomFormProps = {
  name: string;
  isJoining: boolean;
  onNameChange: (name: string) => void;
  onAvatarFileChange: (file: File | null) => void;
  onJoinGame: () => void;
};

export function JoinRoomForm({
  name,
  isJoining,
  onNameChange,
  onAvatarFileChange,
  onJoinGame,
}: JoinRoomFormProps) {
  return (
    <>
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Enter your name"
        className="rounded-xl border p-3"
      />

      <input
        type="file"
        accept="image/*"
        onChange={(event) => onAvatarFileChange(event.target.files?.[0] || null)}
        className="rounded-xl border p-3"
      />

      <button
        onClick={onJoinGame}
        disabled={isJoining}
        className="rounded-xl bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {isJoining ? "Joining..." : "Join Room"}
      </button>
    </>
  );
}
