import { useEffect, useRef, useState } from "react";
import { buildTimeline, fmtClock } from "../timeline";

const KIND_LABEL = { warmup: "Warm-up", run: "Run", walk: "Walk", cooldown: "Cool-down" };

export default function Timeline({ workout }) {
  const segments = buildTimeline(workout);
  const totalSec = segments[segments.length - 1].end;

  const [phase, setPhase] = useState("idle"); // idle | running | paused | done
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(segments[0].durationSec);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // Reset the timer whenever the underlying workout changes.
  useEffect(() => {
    clearInterval(intervalRef.current);
    setPhase("idle");
    setActiveIndex(0);
    setRemainingSec(segments[0].durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  useEffect(() => {
    if (phase !== "running") return;
    intervalRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev > 1) return prev - 1;
        setActiveIndex((idx) => {
          const nextIdx = idx + 1;
          if (nextIdx >= segments.length) {
            clearInterval(intervalRef.current);
            setPhase("done");
            return idx;
          }
          setRemainingSec(segments[nextIdx].durationSec);
          return nextIdx;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function start() {
    setPhase("running");
  }
  function pause() {
    setPhase("paused");
    clearInterval(intervalRef.current);
  }
  function reset() {
    clearInterval(intervalRef.current);
    setPhase("idle");
    setActiveIndex(0);
    setRemainingSec(segments[0].durationSec);
  }

  const active = segments[activeIndex];

  return (
    <div className="card timeline-card">
      <div className="timeline-head">
        <h3>Today's Timeline</h3>
        <span className="timeline-total">{fmtClock(totalSec)} total</span>
      </div>

      {phase === "done" ? (
        <div className={`timeline-live kind-${active.kind}`}>
          <p className="timeline-live-label">Session complete 🎉</p>
          <p className="timeline-live-clock">Nice work — don't forget to mark it complete below.</p>
          <button className="pill-btn ghost" onClick={reset}>
            Reset timeline
          </button>
        </div>
      ) : phase === "running" || phase === "paused" ? (
        <div className={`timeline-live kind-${active.kind}`}>
          <p className="timeline-live-label">{KIND_LABEL[active.kind]}{active.note ? ` · ${active.note}` : ""}</p>
          <p className="timeline-live-clock">{fmtClock(remainingSec)}</p>
          <div className="timeline-live-controls">
            {phase === "running" ? (
              <button className="pill-btn ghost" onClick={pause}>
                Pause
              </button>
            ) : (
              <button className="pill-btn" onClick={start}>
                Resume
              </button>
            )}
            <button className="pill-btn ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      ) : (
        <button className="pill-btn" onClick={start}>
          Start timeline
        </button>
      )}

      <ol className="timeline-list">
        {segments.map((seg, idx) => (
          <li
            key={seg.id}
            className={`timeline-row kind-${seg.kind} ${idx === activeIndex && phase !== "idle" ? "active" : ""}`}
          >
            <span className="timeline-dot" />
            <span className="timeline-info">
              <span className="timeline-label">
                {KIND_LABEL[seg.kind]}
                {seg.note ? <span className="timeline-note"> · {seg.note}</span> : null}
              </span>
              <span className="timeline-range">
                {fmtClock(seg.start)}–{fmtClock(seg.end)}
              </span>
            </span>
            <span className="timeline-duration">{fmtClock(seg.durationSec)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
