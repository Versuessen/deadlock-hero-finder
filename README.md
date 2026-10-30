# Deadlock Soulmate

An unofficial fan site that matches you to a hero in Valve's [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/). Answer a short playstyle quiz and a tarot-style reading picks your hero.

**Try it:** https://deadlock-soulmate.vercel.app/

![The Deadlock Soulmate home page: a fan of hero cards next to the question "Which hero answers your call?" and a button to begin the reading](.github/assets/home.jpg)

## What's on the site

- **The reading.** 24 questions in six sections cover aim, range, mobility, team role, power curve and style. Each answer is scored against every hero across 23 playstyle traits. The result shows your top hero with the reasons and trade-offs behind the match, plus your runners-up.
- **Playing with friends.** Add up to three heroes your friends play. Heroes that team well with theirs move up your ranking, and heroes they already play drop out of it.
- **Sharing.** Every reading gets a share link, a short code a friend can paste in, and a downloadable result card.
- **Hero dossiers.** All 44 heroes have a page with their abilities (including upgrade tiers and cooldowns), base stats, voice lines, backstory, team fits and counters.
- **Compare.** See up to three heroes side by side: health, movement, weapon numbers and abilities, with the best value in each row circled.
- **Deadlock twin.** Pick a hero you play in Overwatch, Marvel Rivals, Valorant, League of Legends or Apex Legends, and see which Deadlock heroes play the same way.

![A quiz result: Rat King as the 81% "clear pick", with his card, name mark, voice line and a short pitch](.github/assets/result.jpg)

![The compare page showing Rat King, Violet and Nurse Harrow side by side, with health, regen and movement stats](.github/assets/compare.jpg)

## Status and limitations

- **Personal fan project, updated by hand.** The data is a snapshot of game build 6805 (October 2026) and covers all 44 playable heroes, including Rat King, Baba, Solomon, Deadman Danny, Violet and Nurse Harrow. Balance patches after that build aren't reflected until the data is regenerated.
- **Some content is judgement, not game data.** Stats, abilities and descriptions come from the game files. The quiz trait scores, hero pitches, team fits and cross-game twins are hand-written opinions.
- **Cross-game rosters are dated.** Each game's roster is as of the date recorded in its `xg/<game>/data.json` (for example, Overwatch Season 5 and League of Legends patch 26.19).
- **English only.** Works on desktop and mobile browsers. Quiz progress, friends' heroes and the sound settings are saved in your browser's local storage. There are no accounts.

## How it's built

There is no framework and no build step on the server. `pipeline/build2.py` assembles everything into a single self-contained `site/index.html` (markup, CSS, JavaScript and hero data inlined). Vercel serves the `site/` folder as static files, and `site/vercel.json` only redirects the site's old address.

| Path | Contents |
| --- | --- |
| `site/` | The deployed site: `index.html`, `img/` (cards, renders, ability icons, name marks, voice-line audio, fonts, UI art), `og.jpg` and `favicon.png`. |
| `src/` | Page sources. `template2.html` holds the markup and CSS, `app2.js` the app, and `model.js` the questions and scoring. `edit.js` has the hand-written pitches, ability one-liners and trait scores, and `team.js` the team fits and counters. `extra.js` is generated data. The folder also holds the quiz tests. |
| `pipeline/` | Python scripts that turn game files into data and build the page. |
| `xg/` | Cross-game rosters and portraits (`xg/<game>/data.json`), weapon stats, overview text and voice-line metadata. |
| `*.json` (root) | Generated hero data: base stats, ability stats and texts, kits, and `codes.json`, which maps the site's hero ids to the game's. |

## Development

You need Python 3 (3.13 tested; the page build uses only the standard library) and Node.js (22 tested) for the tests.

```bash
# Rebuild site/index.html after editing anything in src/ or the data files
python3 pipeline/build2.py

# Preview locally at http://localhost:8000
python3 -m http.server 8000 --directory site

# Check the quiz still works for every hero (takes a few seconds)
node src/test.js reach
```

`test.js reach` searches for the answers that favour each hero most. Every hero should show `1` in the third column, which means some set of answers makes them the top match. `node src/test2.js` prints how often each hero comes first for thousands of simulated players.

`build2.py` also writes `artifact/index.html` (git-ignored), the same page without its `<html>` and `<head>` wrapper.

**Deploying:** every push to `main` deploys to Vercel automatically, with `site/` as the project's root directory.

### Updating hero data after a game patch

This also needs [Pillow](https://pypi.org/project/pillow/) (`pip install pillow`) and a sparse clone of [GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock) in `gt/` (about 20 MB, git-ignored). Run everything from the repository root:

```bash
# Game files: hero and ability data plus the English localization
git clone --depth 1 --filter=blob:none --sparse https://github.com/SteamTracking/GameTracking-Deadlock gt
git -C gt sparse-checkout set --no-cone /game/citadel/pak01_dir/scripts/heroes.vdata \
  /game/citadel/pak01_dir/scripts/abilities.vdata '/game/citadel/resource/localization/*/*_english.txt'

python3 pipeline/parse_heroes.py    # heroes.vdata            -> heroes_raw.json
python3 pipeline/build_kits.py      # + localization          -> kits.json (and a readable kits.txt)
python3 pipeline/fetch_assets.py    # deadlock-api.com        -> ext/ (API lists, ability icons), xg/val/icons/
python3 pipeline/update_base.py     # all of the above        -> hero_base.json, codes.json, new ability icons
python3 pipeline/hero_images.py     # new heroes only         -> card, hover art, render and name mark
python3 pipeline/abil_stats.py      # abilities.vdata         -> abil_stats.json
python3 pipeline/gen_abil_text.py   # localization            -> abil_text.json
python3 pipeline/wpn3.py            # weapon stats            -> xg/hstats.json
python3 pipeline/data3.py           # everything              -> src/extra.js, site/img/xg/*.webp
python3 pipeline/build2.py          #                         -> site/index.html
node src/test.js reach
```

`update_base.py` prints every field that changed, which makes a patch easy to review. To update to an older build, check it out in `gt/` first (`git -C gt fetch --depth=300` and `git -C gt checkout <commit>`). Run against build 6805, the scripts reproduce the committed data.

A newly released hero gets its stats, abilities, pictures and lore from the scripts. These parts are hand-written and must be added before the page will work:

- **`src/edit.js`:** pitch, four ability one-liners, the 23 quiz trait scores, aesthetic, gun feel and gimmicks. The page breaks for a hero without an entry.
- **`src/team.js`:** three heroes they play well with and three to watch out for, each with a reason.
- **`xg/<game>/data.json`:** add the hero to some characters' `twins` lists and set its closest match in `fwd`, for each of the five games.
- **`xg/ov_fill.json`:** a role line and playstyle text, for heroes the game files give none.
- **`codes.json`:** optionally rename the site id `update_base.py` made up from the hero's name (for example, `deadmandanny` to `danny`).
- **Voice lines (optional):** list them in `LINES` in `pipeline/new_vo.py` with their Deadlock Wiki file names, then run it (needs `ffmpeg`).

## Credits

- **Game data:** [SteamTracking/GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock) (`heroes.vdata`, `abilities.vdata`, localization).
- **Hero cards, name marks, ability icons and colours:** the [deadlock-api.com](https://deadlock-api.com) assets API.
- **Hero renders, voice lines, innates and release dates:** the [Deadlock Wiki](https://deadlock.wiki).
- **Fonts, UI art and sounds:** Deadlock, © Valve.
- **Cross-game portraits:** [overwatch-hero-icons](https://github.com/drippinghere/overwatch-hero-icons), [rivals-player-assets](https://github.com/yuqichin/rivals-player-assets), [valorant-agent-picker](https://github.com/andrerfcsantos/valorant-agent-picker), [LoL_DDragon](https://github.com/InFinity54/LoL_DDragon) and [GameTeamer](https://github.com/HyIsNoob/GameTeamer) (Apex Legends).

## Contributing

This is a personal project that I update now and then, so I'm not taking pull requests or feature requests. You're welcome to fork it under the license below.

## License

The code and the hand-written content are [MIT licensed](./LICENSE). That doesn't cover the game material the site uses: Deadlock's assets and data are © Valve Corporation, and characters from other games are © their respective owners (Blizzard, NetEase and Marvel, Riot Games, Electronic Arts and Respawn). [LICENSE](./LICENSE) lists exactly what is excluded.

This is an unofficial fan project, not affiliated with or endorsed by Valve or any other game publisher.
