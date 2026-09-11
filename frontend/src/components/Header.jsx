export default function Header({ title = "Your Plan" }) {
  return (
    <header className="app-header">
      <div className="avatar">P</div>
      <h1>{title}</h1>
      <button className="icon-btn" aria-label="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
    </header>
  );
}
