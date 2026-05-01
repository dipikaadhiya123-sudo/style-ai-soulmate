## StyleAI – Smart Personal Stylist (Web App v1)

A premium, responsive web app (installable on iOS/Android via "Add to Home Screen") that gives AI-powered personal styling advice. No native Flutter build, no rendered try-on — instead a fast, polished web experience powered by Lovable Cloud + Lovable AI.

### What ships in v1

**1. Onboarding & Profile**
- Email + Google sign-in
- Profile setup: gender, height, weight, skin tone, hair type, body shape, style preferences
- Editable later from a profile page

**2. Photo Studio**
- Upload face photo + full-body photo (stored privately in Lovable Cloud Storage)
- AI analyzes photos to extract: detected skin tone, hair type, body proportions, face shape
- Results saved to profile

**3. AI Stylist (core loop)**
- Pick an occasion: Casual, Party, Wedding, Office, Date, Kids
- AI generates a personalized outfit recommendation: top, bottom, footwear, accessories
- Each recommendation includes a written rationale referencing the user's body/skin/hair
- Style score (1–10) with breakdown (fit, color harmony, occasion match)
- Bonus suggestions: makeup, hairstyle, nail art, skincare tip — tailored to the look

**4. Chatbot Stylist**
- Streaming AI chat: "What should I wear to a beach wedding?", "Does navy suit my skin tone?"
- Context-aware: knows the user's profile and recent outfits

**5. Save & Share**
- Save any outfit to a personal lookbook
- Share via public link (read-only outfit page)

**6. UI/UX**
- Premium editorial aesthetic — bold serif display headings paired with refined sans body
- Warm neutral palette with a single jewel accent
- Smooth page transitions and card animations (framer-motion)
- Dark/light mode toggle
- Mobile-first, fully responsive
- Installable PWA (manifest only, no service worker — avoids preview issues)

### What's deferred (v2+)

Rendered virtual try-on, 3D avatar, shopping/affiliate links, premium subscriptions, mix-and-match drag-drop. Architecture leaves room for all of these.

### Technical approach

| Concern | Implementation |
|---|---|
| Frontend | React + Vite + Tailwind + shadcn (already scaffolded) |
| Auth, DB, Storage | Lovable Cloud (email + Google) |
| AI styling + chat + photo analysis | Lovable AI Gateway, default model `google/gemini-3-flash-preview`; chat uses streaming SSE; structured outfit output via tool calling |
| Photos | Private storage bucket, signed URLs, RLS-protected |
| State | React Query + URL state |
| Animation | framer-motion |
| Install | `manifest.json` + icons (no service worker) |

### Database tables (Lovable Cloud)

- `profiles` — user_id, gender, height_cm, weight_kg, skin_tone, hair_type, body_shape, style_prefs, face_photo_path, body_photo_path, ai_analysis (jsonb)
- `outfits` — id, user_id, occasion, items (jsonb), style_score, rationale, suggestions (jsonb), share_slug, created_at
- `chat_messages` — id, user_id, conversation_id, role, content, created_at

RLS: users only read/write their own rows; shared outfits readable by anyone with the slug.

### Edge functions

- `analyze-photos` — runs Gemini vision on uploaded face + body photos, returns structured analysis
- `recommend-outfit` — takes profile + occasion, returns structured outfit + score + suggestions (tool calling)
- `chat-stylist` — streaming SSE chat with profile context

### Pages

- `/` — hero landing, sign in / get started
- `/onboarding` — multi-step profile setup
- `/studio` — upload photos, see AI analysis
- `/stylist` — pick occasion, generate outfit, view score & suggestions
- `/chat` — streaming AI stylist chat
- `/lookbook` — saved outfits
- `/outfit/:slug` — public shared outfit view
- `/profile` — edit profile, theme toggle, sign out

### Build order

1. Design system (typography, palette, tokens, dark mode), landing page, manifest
2. Enable Lovable Cloud, auth, profiles table, onboarding flow
3. Storage bucket, photo upload UI, `analyze-photos` function
4. `recommend-outfit` function, stylist page with score + suggestions
5. Lookbook, save & share
6. `chat-stylist` streaming function and chat UI
7. Polish: animations, empty states, error toasts (incl. AI 402/429 handling)

### Notes & caveats

- This is a web app. It will be installable on phones, but not published to App/Play Store.
- AI styling advice is text + reference imagery only — no photorealistic try-on render in v1.
- Lovable AI usage is metered; free monthly allowance applies, then top-up at Settings → Workspace → Usage.
- Shopping integration excluded from v1 per your selection — easy to add later as affiliate links.
