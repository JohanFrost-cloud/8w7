# Vocab Perfect 🧪

A premium English → Uzbek vocabulary learning lab.  
**Pure static site — no build step, no server, no Python.**  
Open `index.html` or deploy to GitHub + Cloudflare Pages in 2 minutes.

---

## What's inside (300+ learning features)

| Area | Content |
|------|---------|
| **Words** | 1,500-word dictionary (EN ↔ UZ) · meanings · forms · synonyms · antonyms · examples · context · usage · collocations · enrich notes |
| **Phrases** | 576 phrases & idioms grouped by type · save · search · random |
| **Grammar** | 32 topics with use, examples and tips · quiz link |
| **Prepositions** | 19 preposition patterns |
| **Games** | **17 modes**: Meaning Match, Reverse, Spelling, Context, Synonym, Antonym, True/False, Odd One Out, Phrase Meaning, Grammar Recall, Preposition Pattern, Listening, Mixed, Speed Round, Boss Round, Translation, Example Completion · difficulty · lives · timers |
| **Notebook** | Personal word bank · status · bulk actions · tags |
| **Review** | Spaced-repetition (SM-2 style boxes) · flip · rate 1–4 · keyboard |
| **Match** | Pair-matching memory game |
| **Shatter** | Error-hunter (IELTS + Daily) · cut / rewrite modes |
| **Quest** | 5-stage map adventure with XP & restart |
| **Stats** | Heatmap · accuracy · records · activity · level & XP ring |
| **Settings** | **19 character themes** · TTS voice & rate · SFX · daily goal · strict typing · full backup/restore · CSV export |
| **Global** | Command palette (`Ctrl+K`) · keyboard shortcuts · confetti · particles · toast · offline localStorage · PWA installable |

**About panel** shows a live feature inventory (currently **344+** discrete learning/UI features).

All progress is saved in your browser (`localStorage`). Works offline after first load.

---

## Run locally

Double-click **`index.html`** — it works straight from disk.  
Or serve it: `npx serve .`

---

## Deploy with GitHub + Cloudflare Pages

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Vocab Perfect"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/vocab-perfect.git
   git push -u origin main
   ```
   (Create an empty repo on github.com first — no README.)

2. **Connect Cloudflare Pages**
   - https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
   - Pick the repo
   - Build settings:
     - **Build command:** *(leave empty)*
     - **Build output directory:** `/`
   - **Save and Deploy** → free `https://vocab-perfect.pages.dev` URL

No Python, no Node build, nothing to install server-side.

---

## File structure

```
vocab-perfect/
├── index.html              ← the app (open this)
├── styles.css              ← design system + 19 themes + premium polish
├── favicon.svg
├── manifest.webmanifest    ← PWA install support
├── js/
│   ├── core.js             ← state, XP, achievements, themes, TTS, router
│   ├── words.js            ← Words / Phrases / Grammar / Preps + detail modals
│   ├── games.js            ← quiz engine + 17 game modes
│   ├── study.js            ← Notebook, SRS Review, Match, Shatter
│   ├── quest.js            ← Quest map game
│   └── stats.js            ← Home, Stats, Settings, feature inventory
└── data/
    ├── words.js            ← 1,500 words
    ├── phrases.js          ← 576 phrases
    ├── grammar.js          ← 32 topics
    ├── preps.js            ← 19 patterns
    ├── games.js            ← game mode list
    ├── themes.js           ← 18 character themes
    ├── writing.js          ← 1,031 error-hunter sentence pairs
    ├── enrich.js           ← collocations & explanations
    └── vocab-perfect-dataset.json ← full raw dataset backup
```

---

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `1`–`9`, `0`, `-`, `=` | Switch tabs |
| `Ctrl`+`K` | Global search (words, phrases, grammar) |
| `Space` | Flip flashcard (Review) |
| `1`–`4` | Rate flashcard (again / hard / good / easy) |
| `Esc` | Close modal / quit game |

---

## Backing up

**Settings → Export backup** downloads all progress as JSON.  
Restore any time with **Import backup**.

---

## Design

Dark cyberpunk / anime-inspired UI with 19 accent themes (default crimson + Emilia, Rem, Naruto, Itachi, Hacker, …).  
Glass panels, confetti, particle shards, soft glow, refined motion, accessible focus rings, reduced-motion support.

Made for serious learners who want a beautiful, offline-capable lab.
