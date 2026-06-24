type LoadingScreenProps = {
  title: string;
  message: string;
};

export function LoadingScreen({ title, message }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center space-y-6 bg-purple-700 text-white">
      <div className="animate-bounce text-7xl">🎨</div>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="opacity-80">{message}</p>
    </div>
  );
}
