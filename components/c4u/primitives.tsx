"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { AgentState } from "./types";

/* ------------------------------------------------------------------ Button */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "navy"
  | "navy-on-dark"
  | "ghost"
  | "quiet";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
  leading,
  disabled,
  type = "button",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  onClick?: () => void;
  leading?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      className={`c4u-btn c4u-btn--${variant} c4u-btn--${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {leading ? <span className="c4u-btn__leading">{leading}</span> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ StateDot, Pill */

export function StateDot({
  state,
  size = 8,
  pulse,
}: {
  state: AgentState | string;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <span
      className={`c4u-dot ${pulse ? "is-pulse" : ""}`}
      style={{
        background: `var(--state-${state})`,
        width: size,
        height: size,
      }}
    />
  );
}

export function Pill({
  state,
  label,
  live,
  variant,
}: {
  state?: AgentState | string;
  label: string;
  live?: boolean;
  variant?: "dark";
}) {
  if (live) {
    return (
      <span className="c4u-pill c4u-pill--live">
        <span
          className="c4u-dot is-pulse"
          style={{ background: "var(--c4u-snow)" }}
        />
        {label}
      </span>
    );
  }
  return (
    <span className={`c4u-pill ${variant === "dark" ? "c4u-pill--dark" : ""}`}>
      {state ? <StateDot state={state} /> : null}
      {label}
    </span>
  );
}

/* --------------------------------------------------------------- VoiceSphere */

export type SpherePhase = "idle" | "listening" | "speaking" | "done";

export function VoiceSphere({
  size = 220,
  phase = "listening",
}: {
  size?: number;
  phase?: SpherePhase;
}) {
  const active = phase !== "idle" && phase !== "done";
  const cls = [
    "c4u-sphere",
    phase === "speaking" && "is-speaking",
    phase === "listening" && "is-active",
    phase === "done" && "is-done",
  ]
    .filter(Boolean)
    .join(" ");

  const ringSize = size + 20;
  const ringSize2 = size + 44;
  const ringSize3 = size + 72;

  return (
    <div
      className={`c4u-sphere-stage ${active ? "is-active" : ""}`}
      style={{ width: ringSize3, height: ringSize3 }}
    >
      <div
        className="c4u-sphere-stage__ring c4u-sphere-stage__ring--1"
        style={{ width: ringSize, height: ringSize }}
      />
      <div
        className="c4u-sphere-stage__ring c4u-sphere-stage__ring--2"
        style={{ width: ringSize2, height: ringSize2 }}
      />
      <div
        className="c4u-sphere-stage__ring c4u-sphere-stage__ring--3"
        style={{ width: ringSize3, height: ringSize3 }}
      />
      <div className={cls} style={{ width: size, height: size }}>
        <div className="c4u-sphere__blob" />
        <div className="c4u-sphere__blob--b" />
        <div className="c4u-sphere__shine" />
        <div className="c4u-sphere__rim" />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Waveform */

export function Waveform({
  bars = 32,
  active = true,
  height = 36,
  color = "var(--c4u-coral)",
}: {
  bars?: number;
  active?: boolean;
  height?: number;
  color?: string;
}) {
  const arr = Array.from({ length: bars });
  return (
    <div className="c4u-wave" style={{ height }}>
      {arr.map((_, i) => (
        <span
          key={i}
          className="c4u-wave__bar"
          style={{
            background: color,
            animationDelay: `${(i * 0.06).toFixed(2)}s`,
            animationPlayState: active ? "running" : "paused",
            height: `${20 + ((i * 37) % 60)}%`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- StatRow */

export function StatRow({
  stats,
}: {
  stats: { label: string; value: number; color?: string }[];
}) {
  return (
    <div className="c4u-stats">
      {stats.map((s) => (
        <div key={s.label} className="c4u-stats__item">
          <div className="c4u-stats__n" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="c4u-stats__l">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- Transcript bits */

export type TranscriptTurn = {
  who: "agent" | "lead";
  ts: string;
  text: string;
  initials?: string;
  speaker?: string;
};

export function TranscriptBubble({ turn }: { turn: TranscriptTurn }) {
  return (
    <div className={`c4u-turn c4u-turn--${turn.who}`}>
      <div className="c4u-turn__av">
        {turn.who === "agent" ? "SA" : turn.initials || "LD"}
      </div>
      <div className="c4u-turn__body">
        <div className="c4u-turn__bubble">{turn.text}</div>
        <div className="c4u-turn__ts">
          {turn.ts} · {turn.who === "agent" ? "agent" : turn.speaker || "lead"}
        </div>
      </div>
    </div>
  );
}

export function TranscriptList({ turns }: { turns: TranscriptTurn[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [turns]);
  return (
    <div className="c4u-transcript" ref={ref}>
      {turns.map((t, i) => (
        <TranscriptBubble key={i} turn={t} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- AudioScrubber */

export function AudioScrubber({
  progress = 0.42,
  duration = 174,
}: {
  progress?: number;
  duration?: number;
}) {
  const elapsed = Math.round(progress * duration);
  return (
    <div className="c4u-scrub">
      <button className="c4u-scrub__play" aria-label="Play">
        ▶
      </button>
      <div className="c4u-scrub__rail">
        <div
          className="c4u-scrub__fill"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="c4u-scrub__head"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      <div className="c4u-scrub__time">
        <span className="c4u-mono">{formatTimer(elapsed)}</span>
        <span className="c4u-scrub__total c4u-mono">
          / {formatTimer(duration)}
        </span>
      </div>
    </div>
  );
}

export function formatTimer(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
