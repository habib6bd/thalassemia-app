// Generic (D9) push title/body per notification type and language. Never
// interpolate patient name, diagnosis, hospital or phone here — the in-app
// notifications list (backed by RLS-scoped queries) is the source of detail;
// push is only a nudge to open the app.

const bodies: Record<"bn" | "en", string> = {
  bn: "বিস্তারিত জানতে অ্যাপে দেখুন।",
  en: "Open the app for details.",
};

const titles: Record<string, Record<"bn" | "en", string>> = {
  connection_requested: { bn: "নতুন সংযোগ অনুরোধ", en: "New connection request" },
  connection_accepted: { bn: "সংযোগ গৃহীত হয়েছে", en: "Connection accepted" },
  connection_ended: { bn: "সংযোগ শেষ হয়েছে", en: "Connection ended" },
  request_invited: { bn: "নতুন রক্তের অনুরোধ", en: "New blood request" },
  request_cancelled: { bn: "অনুরোধ বাতিল হয়েছে", en: "Request cancelled" },
  request_fulfilled: { bn: "অনুরোধ সম্পন্ন হয়েছে", en: "Request fulfilled" },
  response_accepted: { bn: "প্রতিক্রিয়া গৃহীত হয়েছে", en: "Response accepted" },
  response_declined: { bn: "প্রতিক্রিয়া প্রত্যাখ্যান হয়েছে", en: "Response declined" },
  response_withdrawn: { bn: "প্রতিক্রিয়া প্রত্যাহার হয়েছে", en: "Response withdrawn" },
  donation_reported: { bn: "দান রিপোর্ট হয়েছে", en: "Donation reported" },
  donation_confirmed: { bn: "দান নিশ্চিত হয়েছে", en: "Donation confirmed" },
};

const defaultTitle: Record<"bn" | "en", string> = {
  bn: "নতুন বিজ্ঞপ্তি",
  en: "New notification",
};

export function normalizeLanguage(language: string | null | undefined): "bn" | "en" {
  return language === "en" ? "en" : "bn";
}

export function getPushText(
  type: string,
  language: string | null | undefined,
): { title: string; body: string } {
  const lang = normalizeLanguage(language);
  const title = titles[type]?.[lang] ?? defaultTitle[lang];
  return { title, body: bodies[lang] };
}
