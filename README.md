# Ritual Reading: Deadlock Hero Finder

An unofficial fan site for Valve's Deadlock. You answer a short questionnaire about how you like to play, and a tarot-style reading picks the hero that suits you. The site also has a dossier for every hero, side-by-side comparisons and a "Deadlock twin" finder for players coming from Overwatch, Marvel Rivals, Valorant, League of Legends and Apex Legends.

**Live site:** https://ritual-reading.vercel.app/

The site covers all 44 playable heroes as of game build 6805 (October 2026). That includes the six heroes released in October 2026: Rat King, Baba, Solomon, Deadman Danny, Violet and Nurse Harrow.

## What's in this repository

| Path | Contents |
| --- | --- |
| `site/` | The deployable static site: `index.html` plus `img/`. Vercel serves this folder as is, with no build step. |
| `src/` | The page sources: `template2.html` (markup and CSS), `app2.js` (the app), `model.js` (questions and scoring), `edit.js` (hand-written pitches, ability one-liners and trait scores), `team.js` (team synergies and counters), and `extra.js` (generated data). It also holds the quiz tests. |
| `pipeline/` | Python scripts that turn the game files into the data above and build `site/index.html`. |
| `xg/` | Cross-game rosters and portraits (`xg/<game>/data.json`), overview text, weapon stats and voice-line data. |
| `*.json` (root) | Generated hero data: base stats, ability stats and texts, and kit lists. |

## Rebuilding

Run every command from the repository root.

```bash
# 1. Generate data (needs the game files, see "Data sources" below)
python3 pipeline/parse_heroes.py      # heroes.vdata  -> heroes_raw.json
python3 pipeline/build_kits.py        #               -> kits.json
python3 pipeline/update_base.py       #               -> hero_base.json, codes.json, ability icons
python3 pipeline/abil_stats.py        # abilities.vdata -> abil_stats.json
python3 pipeline/gen_abil_text.py     # localization  -> abil_text.json
python3 pipeline/wpn3.py              # weapon stats  -> xg/hstats.json
python3 pipeline/data3.py             # everything    -> src/extra.js and the cross-game sprite sheets

# 2. Build the page
python3 pipeline/build2.py            # -> site/index.html

# 3. Check that every hero can still come out on top of the quiz
cd src && node test.js reach
```

## Data sources

- **Game data:** [SteamTracking/GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock) (`heroes.vdata`, `abilities.vdata`, localization). Clone it into `gt/`; it is not committed here.
- **Hero cards, renders, ability icons and colours:** the [deadlock-api.com](https://deadlock-api.com) assets API. Downloaded into `ext/`, which is also not committed.
- **Voice lines, innates and release dates:** the [Deadlock Wiki](https://deadlock.wiki).
- **Editorial content** (pitches, playstyle traits, team fits and cross-game twins) is hand-written.

## Disclaimer

This is an unofficial fan project and is not affiliated with Valve. Deadlock and its assets © Valve Corporation. Other games' characters © their respective owners.
