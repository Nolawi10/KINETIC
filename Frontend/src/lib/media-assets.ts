import logoUrl from "@/assets/Kinetic Logo.png";
import francisUrl from "@/assets/Francis.png";
import israelUrl from "@/assets/Israel.png";
import johnnyUrl from "@/assets/Johnny Jiu-Jitsu.png";
import knockoutClipUrl from "@/assets/Awesome 5 second Knockout!.mp4";

/**
 * Real media files live in `src/assets`.
 *
 * These exports replace the Lovable `*.asset.json` pointer modules, which only
 * resolve inside Lovable's editor — locally they threw
 * `Cannot find module '@/assets/*.asset.json'` and 500'd every SSR render.
 *
 * Kept as `{ url }` objects so component code (`logo.url`, `clip.url`, ...)
 * stays unchanged. Update the imports here when swapping media files.
 */
export const kineticLogo = { url: logoUrl };
export const francisPortrait = { url: francisUrl };
export const israelPortrait = { url: israelUrl };
export const johnnyPortrait = { url: johnnyUrl };
/** Single MP4 rendition — there is no local webm fallback anymore. */
export const knockoutClip = { url: knockoutClipUrl };
