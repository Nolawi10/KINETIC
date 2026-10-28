<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep KINETIC navigation reusable with a dedicated Button variant; all five navigation tabs map to implemented TanStack routes.
- Centralize KINETIC visual styling and semantic OKLCH tokens in src/styles.css so navigation and future screens share a theme.
- Keep below-the-fold presentation in KineticLanding and sport metrics in a shared typed map so selection changes all telemetry consistently and rules can be tested independently.
- Keep partner logos at the explicitly requested public/logos filenames; these third-party organization marks are not the KINETIC app identity or favicon.
- Label generated readings and session previews as simulations; do not imply live tracking without connected hardware.
- Prebundle React-dependent interactive UI libraries at startup in Vite so late dependency discovery cannot mix React module generations during preview updates.
- Drive combat replay overlays from video playback time using manually annotated normalized coordinates; label them illustrative and keep profile data and impact interpolation independently testable.
- Serve uploaded combat video through a Lovable Assets pointer named knockout-clip.mp4 rather than committing the video binary at a public path.
- Keep shared tactical layouts, simulated session rules, and preferences in reusable modules so all screens follow the same theme and testable contracts.
- Store fighter preferences, saved sessions and sparring reports in owner-scoped Cloud tables; keep uploaded sparring footage private with owner-folder storage policies.
- Analyze client-sampled timestamped video frames with authenticated streaming Responses calls; persist reports server-side and distinguish sampled visual coaching from measured telemetry.
- Persist provider-access denials in a server-owned access-block table to prevent further calls until access is restored.
- Keep coaching presets and illustrative foul/round datasets in a shared typed module; hand presets into Live through validated search parameters so refreshes preserve the selection.
- Generate telemetry PDF/CSV exports client-side from the displayed simulation and filtered session list; coach sharing sends an explicit summary only, never private footage or credentials.
