import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuickCreate } from "@/contexts/QuickCreateContext";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsHelpDialog } from "@/components/ShortcutsHelpDialog";

const CHORD_TIMEOUT_MS = 900;

// Gmail-style "g then x" navigation chords.
const CHORD_ROUTES: Record<string, string> = {
  d: "/",
  p: "/patients",
  a: "/appointments",
  o: "/profile",
};

interface KeyboardShortcutsContextType {
  openPalette: () => void;
  openHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

/**
 * Single global keydown listener for the whole app: ⌘K palette, ⌘N / ⌘⇧A
 * quick-create, "?" shortcuts help, and "g then d/p/a/o" navigation chords.
 * No-ops entirely while logged out (mounted above the route switch so it
 * covers /login too, but isAuthenticated gates all handling there).
 */
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { openNewPatient, openNewAppointment } = useQuickCreate();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // The chord buffer is written and read within a couple of keystrokes of
  // each other — a ref (not state) avoids a re-render on every keystroke and
  // sidesteps stale-closure issues in the listener below.
  const chordArmedRef = useRef(false);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    function clearChord() {
      chordArmedRef.current = false;
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K must work even while focus is inside a text input — the one
      // shortcut that has to be summonable from anywhere, always.
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest('[role="combobox"]') !== null);

      if (isTyping) {
        clearChord();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        openNewAppointment();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNewPatient();
        return;
      }
      if (!mod && e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      const key = e.key.toLowerCase();
      if (chordArmedRef.current) {
        clearChord();
        const dest = CHORD_ROUTES[key];
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        return;
      }
      if (key === "g" && !mod) {
        chordArmedRef.current = true;
        chordTimerRef.current = setTimeout(clearChord, CHORD_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearChord();
    };
  }, [isAuthenticated, navigate, openNewPatient, openNewAppointment]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ openPalette: () => setPaletteOpen(true), openHelp: () => setHelpOpen(true) }}
    >
      {children}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider");
  return ctx;
}
