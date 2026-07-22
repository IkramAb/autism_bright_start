export function ModulePlaceholder({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[12px] bg-blue-light text-xl text-blue-dark">
        <i className="ti ti-hammer" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-sm text-ink2">{description}</p>
      <span className="pill pill-amber mt-2">{phase}</span>
    </div>
  );
}
