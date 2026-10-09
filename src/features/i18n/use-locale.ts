"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "./messages";

const localeEvent = "ayos-locale-change";

function readLocale(): Locale {
  const locale = window.localStorage.getItem("ayos-locale");
  return locale === "fil" ? "fil" : "en";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(localeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(localeEvent, onStoreChange);
  };
}

export function useLocale() {
  const locale = useSyncExternalStore<Locale>(subscribe, readLocale, (): Locale => "en");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function chooseLocale(nextLocale: Locale) {
    window.localStorage.setItem("ayos-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new Event(localeEvent));
  }

  return { locale, chooseLocale };
}
