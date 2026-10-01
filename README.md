# Bubble City

[**Play Bubble City in your browser**](https://beriguonffni-collab.github.io/bubble-city/)

A sunlit canal city with a submerged world, full-body flight and swimming, steerable yachts, saved surface pings and destructible architecture. Desktop keyboard and mouse recommended.

## Play

Click **Enter the Universe**, then click the world to capture the mouse. Escape releases it.

| Control | Action |
| --- | --- |
| WASD | Move |
| Double F | Free flight, following your view |
| Double G | Flight at a locked altitude |
| Double W | Walk |
| Space / Q | Rise / dive in free flight and swimming |
| Space on foot | Jump |
| Shift | Sprint or boost; quick forward flight taps produce a sonic boom |
| Z | Phase through solids and water |
| E / hold E | Climb or splash / expressions |
| B near a yacht | Board; E at the wheel takes the helm |
| X / double X | Travel to selected favorite / place or remove a surface ping |
| Shift + double X | Add another numbered ping |
| Mouse wheel | First/third-person zoom |
| R / H | Return to arrival / hide interface |

Open **?** in the world for all controls. Settings includes resolution, render distance, expensive-effect switches, sound and optional destruction modes.

## Saves and privacy

Each visitor starts with no saved places. Favorites and preferences stay in that visitor's browser storage; there is no account, analytics service or multiplayer server. Saves on another website or localhost are separate. Destruction resets when the page reloads.

## Run locally

Serve the docs directory using any static HTTP server; for example, with Python installed: `python -m http.server 8080 --directory docs`. Then open http://localhost:8080. Opening index.html as a file will not load JavaScript modules correctly.

## Hosting and updates

GitHub Pages publishes the main branch's /docs directory. All runtime dependencies are bundled. No build service, paid API, private server, or local Universe Library is required. The author generates this public edition from the main local project, then commits the refreshed docs directory here.

## Credits

- Three.js r160 and bundled helpers — MIT; see docs/vendor/THREE-LICENSE.txt.
- polygon-clipping — MIT; see docs/vendor/polygon-clipping.LICENSE.md.
- Pearl Diver base rig and authored animation libraries — Quaternius, CC0; see docs/avatar/CREDITS.txt and LICENSE.txt.
- Sonic Boom Massive — AirMan, CC BY 3.0, edited and layered; see docs/audio/sonic-boom-source.json.
- Music: Warframe · Dog Days Theme. Walking and jumping samples: Roblox. Source records are in docs/audio. These third-party assets are not covered by a license for the original game code.

Third-party assets retain their stated licenses. No blanket open-source license is granted for the original game code or artwork by this repository.
