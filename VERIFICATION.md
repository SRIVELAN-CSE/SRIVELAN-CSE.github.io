# Verification and handoff

The cream, terracotta, and forest-green palette passed **78 responsive and interaction checks** and **13 focused contrast/content checks** in headless Google Chrome. The preceding typography update also passed **61 checks at native 200% browser zoom**; this color-only update preserves those layout dimensions and font sizes. The reproducible browser script is `tools/verify.mjs`; its reports and screenshots are in the ignored `.preview/` directory.

| Area | Result |
| --- | --- |
| Mobile: 320×740, 375×812, 390×844 | Passed. No horizontal overflow; all artwork loads; all three projects and expanded details fit. |
| Tablet: 768×1024 | Passed. Hero and project cards stack for readable text; the mobile navigation fits. |
| Small desktop / landscape tablet: 1024×768 | Passed. Content and project expansion fit without horizontal overflow. |
| Desktop: 1440×1000, 1920×1080 | Passed. Hero, alternating projects, timeline, and asymmetric foundation grid fit. |
| Native 200% browser zoom: 1280×1000, 1440×1000, 1920×1200 windows | Passed during the preceding typography update; not repeated for this color-only change. Effective layout viewport widths were 631, 711, and 951 CSS pixels. Device-pixel ratio was 2 and visual viewport scale was 1. Text, navigation, expanded projects, keyboard operation, and an actual resume download passed at 200%. |
| Typography | Passed. Body text is 18px on desktop and at least 16px on mobile. Navigation/buttons are at least 16px; all meaningful labels are at least 14px; section headings are 30–48px and the hero name is 44–88px. Controls are at least 44px high. The full name reads together without an isolated initial. |
| Floating header | Passed. The header stays within the mobile viewport and each section heading clears the measured navigation height after anchor navigation, including at 200% zoom. |
| Mobile navigation | Passed. Initially collapsed; Enter opens; Tab enters links; destination selection closes and focuses the section; Escape restores trigger focus; resizing restores the correct navigation layout. |
| Active navigation | Passed at Home, Work, Experience, About, and Contact. Native anchors update the URL fragment. All internal anchors resolve. |
| Keyboard | Passed. Skip link focuses main content. Each project opens with Enter and closes with Space. Project summaries show visible keyboard outlines. |
| Reduced motion | Passed. No active animations with the preference enabled. |
| JavaScript disabled | Passed. Main content and mobile navigation remain visible, layout does not overflow, and native project details still open using the keyboard. |
| Contact links | Passed. Email, phone, GitHub, and LinkedIn href values match the updated PDF. Social links include safe new-tab attributes. |
| Resume download | Passed. Local resource returns successfully; a real browser-triggered download produces `Srivelan_M_Resume.pdf`, identical to the packaged original. The packaged PDF also matches the supplied file byte for byte. |
| Structure and runtime | Passed. One primary heading, three projects, six certifications, unique IDs, local resources, visible settled reveals, and no browser JavaScript exceptions. |
| Content preservation | Passed. Project details, timeline, skills, certifications, education, interests, contact copy, every link/download attribute, and the packaged PDF match the version before this color and typography update. |
| Static code checks | `node --check script.js`, `node --check tools/verify.mjs`, and `git diff --check` passed. |

The contrast audit inspected **217 rendered text elements**, including expanded project content, against their actual composited backgrounds. The lowest ratio was **5.25:1**, exceeding 4.5:1. Hover states also passed. Examples: cream on terracotta **6.04:1**, supporting text on cream **6.28:1**, forest green on sage **6.66:1**, and terracotta on sage **5.25:1**. No paragraph text sits over a gradient. This is a targeted contrast audit, not a complete accessibility certification.

## Content inconsistencies and omissions

- RoutineGuard's resume date range reads **Apr 2026–Mar 2026**. It is omitted from the website and needs correction in the source resume. The downloadable source PDF is intentionally unchanged.
- Civic Welfare's technology stack is not named in the resume. No stack was inferred from general skills.
- Restaurant Manager, Civic Welfare's legacy Flutter/MongoDB stack, automated ranking, location tracking, outcome claims, and other unsupported legacy details were omitted. The complete audit is in `README.md`.
- “Responsive & Safe AI Systems” retains the resume's exact certification wording.

## Limits

- Tests used Chrome viewport emulation, not physical mobile/tablet devices. Safari, Firefox, and screen-reader software were not tested.
- Contact destinations were validated against the resume. No email was sent, phone call placed, or external account accessed; external profile availability and ownership were not independently verified.
- The website was not deployed to a public host. The original PDF and all assets were tested through a local static HTTP server.
- Credential authenticity and the correctness of resume claims were not independently verified.

## Preview artifacts

- `.preview/layout-1440.png`, `.preview/full-1440.png` — desktop.
- `.preview/layout-768.png`, `.preview/full-768.png` — tablet.
- `.preview/layout-390.png`, `.preview/full-390.png` — mobile.
- `.preview/mobile-menu.png` — expanded mobile navigation.
- `.preview/routineguard-expanded.png` — keyboard-expanded project detail.
- `.preview/no-javascript-mobile.png` — JavaScript-disabled fallback.
- `.preview/layout-1440-zoom200.png`, `.preview/full-1440-zoom200.png` — native 200% browser zoom from the preceding typography update, showing the previous palette.
- `.preview/project-civic-light.png`, `.preview/foundation-grid-light.png` — updated project and foundation layouts.
- `.preview/verification.json` — machine-readable results and resume hash.
- `.preview/verification-zoom200.json` — native browser zoom results and measured viewport metrics.
- `.preview/verification-contrast.json` — computed contrast ratios, hover checks, and content-preservation results.
