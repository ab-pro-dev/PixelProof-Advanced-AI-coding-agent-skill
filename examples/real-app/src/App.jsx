import { useState, useEffect } from "react";
import Home from "./Home.jsx";
import Dashboard from "./Dashboard.jsx";

function getRoute() {
  return window.location.pathname;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    function onNav() {
      setRoute(getRoute());
    }
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  function navigate(path) {
    window.history.pushState(null, "", path);
    setRoute(path);
  }

  return (
    <>
      <header className="header">
        <h1>PixelProof App</h1>
        <nav>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            Home
          </a>
          <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>
            Dashboard
          </a>
        </nav>
      </header>
      {route === "/dashboard" ? <Dashboard /> : <Home />}
    </>
  );
}
