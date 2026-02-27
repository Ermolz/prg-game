export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 font-medium shadow-sm">
      {message}
    </div>
  );
}
