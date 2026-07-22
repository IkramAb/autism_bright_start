export default function CaseNotesLoading() {
  return (
    <div className="page-full">
      <div className="page-toolbar">
        <div>
          <div className="skeleton-line" style={{ width: 180, height: 16 }} />
          <div className="skeleton-line" style={{ width: 260, height: 12, marginTop: 6 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skeleton-line" style={{ width: 140, height: 34, borderRadius: 9 }} />
          <div className="skeleton-line" style={{ width: 150, height: 34, borderRadius: 9 }} />
        </div>
      </div>
      <div className="page-body">
        <div className="skeleton-block" style={{ height: 72 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-line" style={{ width: 120, height: 32, borderRadius: 8 }} />
          ))}
        </div>
        <div className="skeleton-block" style={{ height: 320, marginTop: 14 }} />
      </div>
    </div>
  );
}
