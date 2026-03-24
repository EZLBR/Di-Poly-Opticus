export default function Navbar({ session, darkMode, route, onNavigate, onOpenDesigns, onToggleTheme, onLogout }) {
  return (
    <header className="navbar">
      <div className="logo">OPTICUS</div>

      <nav>
        <button
          type="button"
          className={route === "marketplace" ? "active link-button" : "link-button"}
          onClick={() => onNavigate("marketplace")}
        >
          SUNGLASSES
        </button>
        <button
          type="button"
          className={route === "create" ? "active link-button" : "link-button"}
          onClick={() => onNavigate("create")}
        >
          CREATE
        </button>
        <a href="../import.html">IMPORT MODEL</a>
        <button type="button" className="link-button" onClick={onOpenDesigns}>
          MY DESIGNS
        </button>
      </nav>

      <div className="nav-actions">
        {session ? (
          <div className="session-box">
            <span>
              {session.name} {"\u00B7"} {String(session.role).toUpperCase()}
            </span>
            <button type="button" className="btn" onClick={onLogout}>
              LOGOUT
            </button>
          </div>
        ) : (
          <a href="../login.html" className="btn">
            LOGIN
          </a>
        )}

        <button type="button" className="dark-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          {darkMode ? "SUN" : "MOON"}
        </button>
      </div>
    </header>
  );
}
