export function LoadingScreen({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-4">
      <p className="text-gray-600">Loading…</p>
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 font-medium max-w-md">
          {error}
        </div>
      )}
    </div>
  );
}
