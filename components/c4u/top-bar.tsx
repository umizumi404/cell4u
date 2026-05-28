"use client";

import type { Screen } from "./types";

const NAV: [Screen, string][] = [
  ["landing", "Home"],
  ["onboarding", "Intake"],
  ["deploy", "Deploy"],
  ["warroom", "Live"],
  ["review", "Review"],
];

export function TopBar({
  theme = "light",
  step,
  current,
  onNav,
  enabled,
}: {
  theme?: "light" | "dark";
  step?: string;
  current: Screen;
  onNav: (s: Screen) => void;
  enabled: Set<Screen>;
}) {
  const dark = theme === "dark";
  return (
    <header className={`c4u-topbar ${dark ? "is-dark" : "is-light"}`}>
      <div
        className="c4u-topbar__brand"
        onClick={() => onNav("landing")}
        role="button"
      >
        <span className="c4u-wordmark">cell4you</span>
      </div>
      {step ? <div className="c4u-topbar__step">{step}</div> : null}
      <div className="c4u-topbar__right">
        <nav className="c4u-nav">
          {NAV.map(([k, label]) => (
            <button
              key={k}
              type="button"
              disabled={!enabled.has(k)}
              className={`c4u-nav__link ${current === k ? "is-active" : ""}`}
              onClick={() => enabled.has(k) && onNav(k)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
