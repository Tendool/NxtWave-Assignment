/** Share channels. Client-safe. Instagram has no web share link, so it copies the link and opens the app. */

export type ShareChannel = {
  id: string;
  label: string;
  /** Returns a URL to open, or null when the channel works by copying/native sheet instead. */
  url: (link: string, text: string) => string | null;
  /** copy = copy link to clipboard (and open `after` if given); native = Web Share API */
  action?: "copy" | "native";
  after?: string;
  hint?: string;
};

const e = encodeURIComponent;

export const SHARE_CHANNELS: ShareChannel[] = [
  { id: "whatsapp", label: "WhatsApp", url: (l, t) => `https://wa.me/?text=${e(`${t}\n${l}`)}` },
  { id: "linkedin", label: "LinkedIn", url: (l) => `https://www.linkedin.com/sharing/share-offsite/?url=${e(l)}` },
  { id: "x", label: "X", url: (l, t) => `https://x.com/intent/post?text=${e(t)}&url=${e(l)}` },
  { id: "instagram", label: "Instagram", url: () => null, action: "copy", after: "https://www.instagram.com/", hint: "Link copied — paste it in your story, bio or a DM." },
  { id: "telegram", label: "Telegram", url: (l, t) => `https://t.me/share/url?url=${e(l)}&text=${e(t)}` },
  { id: "facebook", label: "Facebook", url: (l) => `https://www.facebook.com/sharer/sharer.php?u=${e(l)}` },
  { id: "email", label: "Email", url: (l, t) => `mailto:?subject=${e("Free AI workshop — Build your first AI project in 60 minutes")}&body=${e(`${t}\n\n${l}`)}` },
  { id: "device", label: "More…", url: () => null, action: "native", hint: "Opens your phone's share sheet." },
];

export const SHARE_IDS = [...SHARE_CHANNELS.map((c) => c.id), "copy"];
