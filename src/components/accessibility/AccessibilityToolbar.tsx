import { useState, useEffect, useCallback } from "react";
import { Accessibility, Volume2, VolumeX, Type, Eye, Link2, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface A11yPreferences {
  highContrast: boolean;
  dyslexiaFont: boolean;
  highlightLinks: boolean;
  fontScale: number;
}

const DEFAULT_PREFS: A11yPreferences = {
  highContrast: false,
  dyslexiaFont: false,
  highlightLinks: false,
  fontScale: 100,
};

const STORAGE_KEY = "a11y-preferences";

function loadPrefs(): A11yPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

function savePrefs(prefs: A11yPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs: A11yPreferences) {
  const html = document.documentElement;
  html.classList.toggle("a11y-high-contrast", prefs.highContrast);
  html.classList.toggle("a11y-dyslexia-font", prefs.dyslexiaFont);
  html.classList.toggle("a11y-highlight-links", prefs.highlightLinks);
  html.style.setProperty("--a11y-font-scale", String(prefs.fontScale / 100));
  html.style.fontSize = `${prefs.fontScale}%`;
}

export function AccessibilityToolbar() {
  const [prefs, setPrefs] = useState<A11yPreferences>(DEFAULT_PREFS);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyPrefs(loaded);
  }, []);

  const update = useCallback((partial: Partial<A11yPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      applyPrefs(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    update(DEFAULT_PREFS);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, [update]);

  const toggleSpeech = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const main = document.querySelector("main");
    const text = main?.innerText || document.body.innerText;
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="fixed top-20 right-4 z-[55] h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Accessibility options"
        >
          <Accessibility className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 z-[60]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              Text-to-Speech
            </Label>
            <Button
              variant={isSpeaking ? "destructive" : "secondary"}
              size="sm"
              className="w-full"
              onClick={toggleSpeech}
            >
              {isSpeaking ? "Stop Reading" : "Read Page Aloud"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Type className="h-4 w-4" />
              Font Size: {prefs.fontScale}%
            </Label>
            <Slider
              min={100}
              max={150}
              step={5}
              value={[prefs.fontScale]}
              onValueChange={([v]) => update({ fontScale: v })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Eye className="h-4 w-4" />
              High Contrast
            </Label>
            <Switch
              checked={prefs.highContrast}
              onCheckedChange={(v) => update({ highContrast: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Type className="h-4 w-4" />
              Dyslexia-Friendly Font
            </Label>
            <Switch
              checked={prefs.dyslexiaFont}
              onCheckedChange={(v) => update({ dyslexiaFont: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Link2 className="h-4 w-4" />
              Highlight Links
            </Label>
            <Switch
              checked={prefs.highlightLinks}
              onCheckedChange={(v) => update({ highlightLinks: v })}
            />
          </div>

          <Separator />

          <Button variant="outline" size="sm" className="w-full" onClick={resetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}