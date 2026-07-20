"use client";

import type { AnswerLimit, SessionLength, Settings, VoiceMode } from "@/lib/types";
import styles from "./SettingsPanel.module.css";

const LIMITS: AnswerLimit[] = [90, 120, 150];
const LENGTHS: SessionLength[] = [5, 8, 12, "all"];
const VOICE_MODES: VoiceMode[] = ["browser", "elevenlabs", "off"];

export type SettingsPanelProps = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  voices: SpeechSynthesisVoice[];
  onTestVoice: () => void;
  voiceError: string | null;
};

export function SettingsPanel({
  settings,
  onChange,
  voices,
  onTestVoice,
  voiceError,
}: SettingsPanelProps) {
  return (
    <div className={`card ${styles.wrap}`}>
      <Row label="answer limit">
        <Segmented
          options={LIMITS.map((l) => ({ value: String(l), label: `${l}s` }))}
          value={String(settings.limitSec)}
          onSelect={(v) => onChange({ limitSec: Number(v) as AnswerLimit })}
        />
      </Row>

      <Row label="questions">
        <Segmented
          options={LENGTHS.map((l) => ({ value: String(l), label: String(l) }))}
          value={String(settings.questionsPerSession)}
          onSelect={(v) =>
            onChange({
              questionsPerSession: (v === "all" ? "all" : Number(v)) as SessionLength,
            })
          }
        />
      </Row>

      <Row label="rephrase">
        <Toggle
          on={settings.rephrase}
          onToggle={() => onChange({ rephrase: !settings.rephrase })}
        />
      </Row>

      <Row label="read aloud">
        <Toggle
          on={settings.readAloud}
          onToggle={() => onChange({ readAloud: !settings.readAloud })}
        />
      </Row>

      <Row label="voice">
        <Segmented
          options={VOICE_MODES.map((m) => ({ value: m, label: m }))}
          value={settings.voiceMode}
          onSelect={(v) => onChange({ voiceMode: v as VoiceMode })}
        />
      </Row>

      {settings.voiceMode === "browser" && voices.length > 0 && (
        <Row label="browser voice">
          <select
            className={styles.select}
            value={settings.browserVoiceURI ?? ""}
            onChange={(e) => onChange({ browserVoiceURI: e.target.value || null })}
          >
            <option value="">system default</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
        </Row>
      )}

      {settings.voiceMode === "elevenlabs" && (
        <Row label="voice id">
          <input
            className={styles.input}
            value={settings.elevenVoiceId}
            onChange={(e) => onChange({ elevenVoiceId: e.target.value })}
            spellCheck={false}
          />
        </Row>
      )}

      {settings.voiceMode !== "off" && (
        <button className="btn" onClick={onTestVoice}>
          test voice
        </button>
      )}

      {voiceError && <p className="notice">{voiceError}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className="mono">{label}</span>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className={styles.segmented} role="group">
      {options.map((o) => (
        <button
          key={o.value}
          className={`${styles.segment} ${o.value === value ? styles.active : ""}`}
          aria-pressed={o.value === value}
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`${styles.segment} ${on ? styles.active : ""}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      {on ? "on" : "off"}
    </button>
  );
}
