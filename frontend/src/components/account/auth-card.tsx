export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-6 sm:py-10">
      <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
