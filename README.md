# SRIVELAN M — Developer portfolio

A responsive editorial portfolio built with HTML, CSS, and vanilla JavaScript. Deep navy backgrounds and cards, blue alternate sections, bright text, electric-lime actions, and cyan accents create a bold dark design. Original SVG illustrations add warm visual contrast to the night palette. There is no framework, build step, CDN, external font request, or message-submission backend.

Body copy is 18px on desktop and 16px on mobile; navigation and buttons are at least 16px, while captions, dates, badges, and illustration legends are at least 14px. Responsive headings use rem-based sizes: 30–48px for sections and 44–88px for the full name. Meaningful illustration labels live in HTML so they retain their size as the SVG scales. All type uses Segoe UI with Helvetica Neue and Arial fallbacks.

## Preview locally

From this directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000**. Stop the server with Ctrl+C. Opening `index.html` directly also works; a local server is recommended for testing downloads.

For static hosting, publish `index.html`, `style.css`, `script.js`, and the complete `assets/` directory together. Relative asset paths support both root domains and project subdirectories. The current deployment is available at https://srivelan-cse.github.io/.

## Files

- `index.html` — semantic content, floating navigation, native expandable project details, timeline, skills, certifications, education, and contact links.
- `style.css` — responsive layout, typography, interaction states, reduced-motion and print styles.
- `script.js` — accessible mobile navigation, measured header clearance, active-section tracking, and optional scroll reveals.
- `assets/connected-stack.svg` — original frontend/API/database hero composition.
- `assets/civic-welfare.svg`, `assets/routineguard.svg`, `assets/consumer-attention.svg` — original conceptual project illustrations, explicitly labeled in the page. They are not screenshots or measured analytics.
- `assets/favicon.svg` — local portfolio icon.
- `assets/Velan_Resume_Updated.pdf` — unchanged supplied resume, used by both download links.
- `tools/verify.mjs` — browser verification using Node's built-in APIs and an installed Chromium browser.
- `.gitignore` — excludes local browser profiles, screenshots, and test downloads in `.preview/`.

## Content source and editorial decisions

Both `portfolio.zip` and `E:\Velan_Resume_Updated.pdf` were read before editing the website. The updated PDF takes precedence over the old site. Its source hash is:

```text
SHA-256 64ad2e84fe053f62e8579fd94c54200cb6ebe1daf72309973b682e2a4c93366d
```

The site includes both internships, three documented projects, every technical and soft skill in the resume, six certifications, both education entries, interests, Tamil and English, and the exact email, telephone number, GitHub, LinkedIn, and portfolio address. ServiceNow CAD and CSA receive prominent treatment. Frameworks documented in projects are separated from the resume's general technical skill groups.

The hero career objective reads: “Computer Science undergraduate combining application development, ServiceNow, backend engineering, REST APIs, and AI to turn real-world requirements into intelligent and reliable software systems, with a growing focus on automation, security, and scalable solution design.” The separate role label above the name has been intentionally removed.

Omitted or corrected legacy content:

- **Restaurant Manager** and all its technology, feature, and outcome claims: absent from the updated resume.
- **Civic Welfare's Flutter SDK/MongoDB stack, automated complaint sorting/ranking, real-time location tracking, faster resolution, and claimed impact:** not supported by the updated resume. The website documents the actual backend contribution and states that this project's stack is unspecified.
- **Flutter as a general skill, App Developer as a second job title, mobile-development expertise, and Team Collaboration as a listed soft skill:** absent from the updated resume.
- **Bixcel's exact legacy day dates:** replaced with the resume's March–April 2026 range.
- **RoutineGuard's date range:** the PDF reads **“Apr 2026–Mar 2026”**, which is reversed. The website deliberately omits it. The source PDF remains unchanged; the correct dates require the owner's confirmation.

The certification title **“Responsive & Safe AI Systems”** is reproduced exactly as written in the resume; no title correction or credential verification is implied. No achievement metrics, proficiency bars, testimonials, repository/demo URLs, or project screenshots were invented. Project numbers and illustration labels are editorial identifiers only.

## Interaction and accessibility

- Native anchors retain scrolling, browser history, and URL fragments. Active navigation includes `aria-current`.
- Mobile navigation uses a real button, `aria-expanded`, and `aria-controls`. Escape closes it and restores focus. Selecting a destination closes it and moves focus to the section. The header's actual height sets anchor clearance, including at increased browser zoom. Without JavaScript the navigation stays in normal document flow.
- The menu is a non-modal disclosure: normal Tab and Shift+Tab behavior is preserved. It closes when focus leaves or the user clicks outside.
- Project details use native `details`/`summary` and work with Enter, Space, touch, or JavaScript disabled.
- All essential content is present in HTML. Navigation stays visible if JavaScript fails. Scroll reveals never leave content hidden awaiting JavaScript.
- Reduced-motion preferences disable animation and hover movement. There is no scroll interception or continuous animation.
- Visible keyboard focus, a skip link, semantic heading hierarchy, descriptive image alternatives, and generous touch targets are included.
- Email and phone actions use `mailto:` and `tel:`. Social links use the exact resume destinations and identify new-tab behavior. There is no form to imply a working backend.

## Browser verification

Run the integration checks with Node 22 or newer and a local Chromium browser:

```sh
node tools/verify.mjs
```

The default browser path is Windows Chrome. To use another installation:

```sh
node tools/verify.mjs "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
```

The script serves the portfolio on a temporary local port, opens an isolated headless browser, checks responsive layouts at 320, 375, 390, 768, 1024, 1440, and 1920 pixels, exercises keyboard and project interactions, validates contact and asset URLs, and downloads the actual PDF. It also checks JavaScript-disabled navigation/details and reduced motion. Generated screenshots, the download, and `verification.json` are placed in `.preview/`; these are not deployment assets. No packages are installed by this script.

Check native 200% browser zoom at 1280, 1440, and 1920px window widths:

```sh
node tools/verify.mjs --zoom=2
```

This uses Chrome's native zoom setting and verifies a device-pixel ratio of 2, viewport reflow, and a visual viewport scale of 1. It does not substitute CSS zoom or pinch magnification.

Run the focused contrast and content audit:

```sh
node tools/verify.mjs --audit-only
```

It checks rendered text against composited element backgrounds, including expanded details and hover states. When this update's local baseline files are present in `.preview/`, it also compares project, experience, foundation, intro, and contact copy, every link, and PDF bytes with the pre-update version. The hero career objective is intentionally allowed to change.

Browser results and limits are recorded in `VERIFICATION.md`.
