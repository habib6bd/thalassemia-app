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
  request_escalated: { bn: "ব্যাকআপ রক্তদাতাদের জানানো হয়েছে", en: "Backup donors notified" },
  response_accepted: { bn: "প্রতিক্রিয়া গৃহীত হয়েছে", en: "Response accepted" },
  response_declined: { bn: "প্রতিক্রিয়া প্রত্যাখ্যান হয়েছে", en: "Response declined" },
  response_withdrawn: { bn: "প্রতিক্রিয়া প্রত্যাহার হয়েছে", en: "Response withdrawn" },
  donation_reported: { bn: "দান রিপোর্ট হয়েছে", en: "Donation reported" },
  donation_confirmed: { bn: "দান নিশ্চিত হয়েছে", en: "Donation confirmed" },
  appreciation_received: { bn: "আপনার জন্য একটি ধন্যবাদ বার্তা", en: "A thank-you message for you" },
  guardian_added: { bn: "নতুন অভিভাবক যুক্ত হয়েছেন", en: "A guardian was added" },
  guardian_removed: { bn: "আপনাকে অভিভাবক তালিকা থেকে সরানো হয়েছে", en: "You were removed as a guardian" },
  community_comment_added: { bn: "আপনার পোস্টে নতুন মন্তব্য", en: "New comment on your post" },
  community_content_moderated: { bn: "আপনার কমিউনিটি কনটেন্ট পর্যালোচনা হয়েছে", en: "Your community content was reviewed" },
  community_content_auto_hidden: { bn: "কমিউনিটি কনটেন্ট পর্যালোচনা প্রয়োজন", en: "Community content needs review" },
  community_report_urgent: { bn: "জরুরি কমিউনিটি রিপোর্ট", en: "Urgent community report" },
  organization_reverification_due: { bn: "প্রতিষ্ঠান পুনরায় যাচাই করুন", en: "Organization re-verification due" },
  organization_marked_stale: { bn: "প্রতিষ্ঠানের তথ্য পুরোনো হয়েছে", en: "Organization listing is out of date" },
  organization_member_added: { bn: "আপনাকে প্রতিষ্ঠানের স্টাফ হিসেবে যুক্ত করা হয়েছে", en: "You were added as organization staff" },
  content_review_due: { bn: "শিক্ষামূলক লেখা পুনরায় পর্যালোচনা করুন", en: "Awareness content due for review" },
};

// "Urgent" says nothing about the patient, so it stays within D9.
const urgentInviteTitle: Record<"bn" | "en", string> = {
  bn: "জরুরি রক্তের অনুরোধ",
  en: "Urgent blood request",
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
  params?: Record<string, unknown> | null,
): { title: string; body: string } {
  const lang = normalizeLanguage(language);
  const title =
    type === "request_invited" && params?.is_emergency === true
      ? urgentInviteTitle[lang]
      : (titles[type]?.[lang] ?? defaultTitle[lang]);
  return { title, body: bodies[lang] };
}
