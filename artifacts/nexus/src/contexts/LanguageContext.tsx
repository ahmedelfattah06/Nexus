import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Language } from "@/i18n/translations";

export type T = typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: T;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem("nexus-lang") as Language) || "en";
  });

  const isRTL = lang === "ar";
  const t = translations[lang] as T;

  function setLang(l: Language) {
    setLangState(l);
    localStorage.setItem("nexus-lang", l);
  }

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("dir", isRTL ? "rtl" : "ltr");
    html.setAttribute("lang", lang);
    if (isRTL) {
      html.classList.add("rtl");
    } else {
      html.classList.remove("rtl");
    }
  }, [lang, isRTL]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
