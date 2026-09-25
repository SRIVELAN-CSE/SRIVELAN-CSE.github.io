// Browser smoke checks using Node 22+ and an installed Chromium browser.
// Run: node tools/verify.mjs [path-to-chrome-or-edge]
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.preview');
await mkdir(output, { recursive: true });
const profile = resolve(output, `browser-${Date.now()}`);
const browserPath = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const zoom = Number(process.argv.find(arg => arg.startsWith('--zoom='))?.split('=')[1] || 1);
const auditOnly = process.argv.includes('--audit-only');
assert.ok([1, 2].includes(zoom), 'Supported verification zoom levels: 1 and 2');
await mkdir(resolve(profile, 'Default'), { recursive: true });
// Chrome's native profile zoom preference; no CSS zoom or pinch-zoom substitute.
await writeFile(resolve(profile, 'Default', 'Preferences'), JSON.stringify({ partition: { default_zoom_level: Math.log(zoom) / Math.log(1.2) } }));
const sleep = ms => new Promise(done => setTimeout(done, ms));
const report = { browser: browserPath, zoom, auditOnly, layouts: [], checks: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log(`PASS ${name}`); };
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(path); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await sleep(100); }
  }
  assert.ok(port, 'Browser must launch');
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.onopen = done; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const navigate = async (path = '/') => {
    await call('Page.navigate', { url: base + path });
    for (let i = 0; i < 100; i++) {
      await sleep(50);
      if (await evaluate("document.readyState === 'complete' && document.querySelector('#hero-title') !== null")) break;
    }
    // Decode offscreen lazy images for full-page captures, without changing source HTML.
    await evaluate("Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().then(() => true, () => false); }))");
    await sleep(100);
  };
  const viewport = async (width, height, mobile = false) => {
    if (zoom === 1) return call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await call('Emulation.clearDeviceMetricsOverride');
    const { windowId } = await call('Browser.getWindowForTarget');
    await call('Browser.setWindowBounds', { windowId, bounds: { width, height } });
  };
  const key = async (key, code, keyCode, modifiers = 0) => {
    const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined;
    await call('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers, text, unmodifiedText: text });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers });
    await sleep(70);
  };
  const screenshot = async (name, full = false) => {
    const params = { format: 'png', captureBeyondViewport: full };
    if (full) {
      const { cssContentSize } = await call('Page.getLayoutMetrics');
      params.clip = { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 };
    }
    const { data } = await call('Page.captureScreenshot', params);
    await writeFile(resolve(output, `${name}${zoom === 2 ? '-zoom200' : ''}.png`), Buffer.from(data, 'base64'));
  };
  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await call('Runtime.enable');
  if (zoom === 2) {
    await call('Page.navigate', { url: 'chrome://settings/appearance' });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("typeof chrome.settingsPrivate?.setDefaultZoom === 'function'")) break;
      await sleep(50);
    }
    await evaluate("new Promise(resolve => chrome.settingsPrivate.setDefaultZoom(2, resolve))");
    check('Chrome native zoom setting is 200%', await evaluate("new Promise(resolve => chrome.settingsPrivate.getDefaultZoom(resolve))") === 2);
  }
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  if (auditOnly) {
    await viewport(1440, 1000);
    await navigate();
    await evaluate("document.querySelectorAll('details').forEach(d => d.open = true)");
    await evaluate(`window.auditContrast = () => {
      const parse = value => { const channels = value.match(/[\\d.]+/g).map(Number); if (channels.length === 3) channels.push(1); return channels; };
      const blend = (top, bottom) => [0,1,2].map(i => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
      const luminance = rgb => rgb.slice(0,3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0);
      const entries = [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length && !e.closest('.sr-only, [aria-hidden="true"]') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => {
        const ancestors = []; for (let node = e; node; node = node.parentElement) ancestors.push(node);
        let background = [255,255,255,1]; let gradient = false;
        for (const node of ancestors.reverse()) {
          const css = getComputedStyle(node); background = blend(parse(css.backgroundColor), background);
          if (css.backgroundImage !== 'none') gradient = true;
        }
        const fg = blend(parse(getComputedStyle(e).color), background);
        const a = luminance(fg); const b = luminance(background);
        return {text: [...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0,65), ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05), foreground:fg.slice(0,3), background:background.slice(0,3), gradient};
      });
      return {count:entries.length, minimum:Math.min(...entries.map(e=>e.ratio)), failures:entries.filter(e=>e.ratio < 4.5 || e.gradient), pairs: [...new Map(entries.map(e=>[e.foreground.join(',')+'/'+e.background.join(','),e])).values()]};
    }`);
    report.contrast = await evaluate('window.auditContrast()');
    if (report.contrast.failures.length) console.log(report.contrast.failures);
    check('All rendered text, including expanded details, meets 4.5:1 contrast on actual backgrounds', report.contrast.failures.length === 0);
    check('Paragraph text has no gradient behind it', report.contrast.pairs.every(pair => !pair.gradient));
    for (const selector of ['.button-primary', '.button-outline', '.nav-contact', '.project-details summary', '.contact-arrow', '.social-links a']) {
      await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center'})`);
      const point = await evaluate(`(() => {const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await call('Input.dispatchMouseEvent', {type:'mouseMoved', ...point});
      await sleep(300);
      const contrast = await evaluate('window.auditContrast()');
      check(`Hover contrast passes for ${selector}`, contrast.failures.length === 0);
    }
    const baselinePath = resolve(output, 'before-light-index.html');
    const baseline = await readFile(baselinePath, 'utf8').catch(() => null);
    if (baseline) {
    const preserved = await evaluate(`(() => {
      const before = new DOMParser().parseFromString(${JSON.stringify(baseline)}, 'text/html');
      const text = (doc, selector) => [...doc.querySelectorAll(selector)].map(e => e.textContent.replace(/\\s+/g,' ').trim());
      const selectors = ['.project-copy', '.timeline', '.foundation-grid', '.contact', '.hero-intro', '.hero-description'];
      const hrefs = doc => [...doc.querySelectorAll('a')].map(e => [e.getAttribute('href'), e.getAttribute('download')]);
      return {content:selectors.every(s => JSON.stringify(text(before,s))===JSON.stringify(text(document,s))), links:JSON.stringify(hrefs(before))===JSON.stringify(hrefs(document))};
    })()`);
    check('All resume content, project details, and contact copy are unchanged', preserved.content);
    check('Every link and download attribute is preserved', preserved.links);
    check('Packaged PDF is byte-for-byte unchanged', (await readFile(resolve(output, 'before-light-resume.pdf'))).equals(await readFile(resolve(root, 'assets/Velan_Resume_Updated.pdf'))));
    } else {
      report.notes = ['Content comparison skipped: this update’s local pre-change snapshot is not present.'];
    }
    const svgFiles = ['connected-stack', 'civic-welfare', 'routineguard', 'consumer-attention'];
    check('SVGs have no text that shrinks below the readable HTML legends', (await Promise.all(svgFiles.map(name => readFile(resolve(root, 'assets', name + '.svg'), 'utf8')))).every(svg => !svg.includes('<text')));
    for (const selector of ['.project-civic', '.foundation-grid']) {
      await evaluate("document.querySelectorAll('details').forEach(d => d.open = false)");
      await evaluate(`document.querySelector('${selector}').scrollIntoView()`);
      await sleep(100);
      await screenshot(selector.slice(1) + '-light');
    }
  } else {
  for (const [width, height] of zoom === 2 ? [[1280, 1000], [1440, 1000], [1920, 1200]] : [[320, 740], [375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 1000], [1920, 1080]]) {
    await viewport(width, height, width < 700);
    await navigate();
    const layout = await evaluate(`({width: innerWidth, dpr: devicePixelRatio, visualScale: visualViewport.scale, scrollWidth: document.documentElement.scrollWidth, images: [...document.images].every(i => i.naturalWidth > 0), h1: document.querySelectorAll('h1').length, projects: document.querySelectorAll('.project').length, overflow: [...document.querySelectorAll('main p, main h1, main h2, main h3, main a, main summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.textContent.slice(0, 60))})`);
    if (layout.overflow.length || layout.scrollWidth > (zoom === 1 ? width : layout.width)) {
      console.log('Layout diagnostics:', layout);
      console.log(await evaluate(`({client: document.documentElement.clientWidth, screen: screen.width, outer: outerWidth, offenders: [...document.querySelectorAll('body *')].filter(e => {const r=e.getBoundingClientRect(); return r.width && r.right > document.documentElement.clientWidth + 1 && !e.closest('.sr-only');}).slice(0,20).map(e => ({tag:e.tagName, class:e.className, width:e.getBoundingClientRect().width, right:e.getBoundingClientRect().right, left:getComputedStyle(e).left, cssRight:getComputedStyle(e).right}))})`));
    }
    check(`${width}px layout has no horizontal overflow or missing artwork`, layout.scrollWidth <= (zoom === 1 ? width : layout.width) && layout.overflow.length === 0 && layout.images);
    if (zoom === 2) check(`${width}px is native 200% browser zoom`, layout.dpr === 2 && layout.visualScale === 1 && Math.abs(layout.width - width / 2) <= 10);
    check(`${width}px semantic hero and all three projects present`, layout.h1 === 1 && layout.projects === 3);
    await evaluate("document.querySelectorAll('details').forEach(d => d.open = true)");
    check(`${width}px expanded details fit`, await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    const typography = await evaluate(`(() => {
      const visible = e => e.getClientRects().length && !e.closest('[hidden]') && !e.closest('.sr-only') && e.getAttribute('aria-hidden') !== 'true';
      const tiny = [...document.querySelectorAll('body *')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14).map(e => ({text: e.textContent.slice(0,50), size: getComputedStyle(e).fontSize}));
      return { tiny, body: parseFloat(getComputedStyle(document.body).fontSize), headings: [...document.querySelectorAll('h2')].map(e => parseFloat(getComputedStyle(e).fontSize)), controls: [...document.querySelectorAll('.nav-links a, .menu-toggle, .button, summary')].filter(visible).every(e => parseFloat(getComputedStyle(e).fontSize) >= 16 && e.getBoundingClientRect().height >= 44), hero: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize) };
    })()`);
    if (typography.tiny.length) console.log('Small type:', typography.tiny);
    check(`${width}px meaningful labels are at least 14px`, typography.tiny.length === 0);
    check(`${width}px body, headings, name, and controls meet requested sizes`, typography.body >= (layout.width > 640 ? 18 : 16) && typography.headings.every(s => s >= 30 && s <= 48) && typography.controls && typography.hero >= 44 && typography.hero <= 88);
    await evaluate("document.querySelectorAll('details').forEach(d => d.open = false)");
    report.layouts.push({ windowWidth: width, height, ...layout, typography });
    if ([390, 768, 1440].includes(width)) {
      await screenshot(`layout-${width}`);
      await screenshot(`full-${width}`, true);
    }
  }

  await viewport(zoom === 2 ? 1280 : 390, zoom === 2 ? 1000 : 844, zoom !== 2);
  await navigate();
  check('Mobile menu starts collapsed', await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false' && document.querySelector('#nav-links').hidden"));
  await evaluate("document.querySelector('.menu-toggle').focus()");
  await key('Enter', 'Enter', 13);
  check('Enter opens mobile menu', await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'true' && !document.querySelector('#nav-links').hidden"));
  await screenshot('mobile-menu');
  await key('Tab', 'Tab', 9);
  check('Tab enters mobile navigation', await evaluate("document.activeElement.getAttribute('href') === '#home'"));
  await key('Tab', 'Tab', 9);
  await key('Enter', 'Enter', 13);
  check('Keyboard navigation updates fragment, focuses Work, and closes menu', await evaluate("location.hash === '#work' && document.activeElement.id === 'work' && document.querySelector('#nav-links').hidden"));
  check('Active section follows native anchor navigation', await evaluate("document.querySelector('.nav-links a[aria-current]').hash === '#work'"));
  await evaluate("document.querySelector('.menu-toggle').focus()");
  await key(' ', 'Space', 32);
  await key('Escape', 'Escape', 27);
  check('Escape closes menu and restores trigger focus', await evaluate("document.querySelector('#nav-links').hidden && document.activeElement.classList.contains('menu-toggle')"));
  await key('Enter', 'Enter', 13);
  await viewport(zoom === 2 ? 1920 : 1440, 1000);
  await sleep(100);
  check('Resizing an open menu restores desktop navigation', await evaluate("document.querySelector('.menu-toggle').hidden && !document.querySelector('#nav-links').hidden"));
  await viewport(zoom === 2 ? 1280 : 390, zoom === 2 ? 1000 : 844, zoom !== 2);
  await sleep(100);
  check('Returning to mobile collapses menu', await evaluate("!document.querySelector('.menu-toggle').hidden && document.querySelector('#nav-links').hidden"));

  for (let i = 0; i < 3; i++) {
    await evaluate(`document.querySelectorAll('summary')[${i}].focus()`);
    await key('Enter', 'Enter', 13);
    check(`Project ${i + 1} opens with Enter`, await evaluate(`document.querySelectorAll('details')[${i}].open`));
    check(`Project ${i + 1} has visible keyboard focus`, await evaluate(`getComputedStyle(document.querySelectorAll('summary')[${i}]).outlineStyle !== 'none'`));
    if (i === 1) await screenshot('routineguard-expanded');
    await key(' ', 'Space', 32);
    check(`Project ${i + 1} closes with Space`, await evaluate(`!document.querySelectorAll('details')[${i}].open`));
  }
  await viewport(1440, 1000);
  for (const section of ['home', 'work', 'experience', 'about', 'contact']) {
    await evaluate(`document.getElementById('${section}').scrollIntoView()`);
    await sleep(80);
    check(`Active navigation at ${section}`, await evaluate(`document.querySelector('.nav-links a[aria-current]').hash === '#${section}'`));
    check(`Floating navigation clears the ${section} content`, await evaluate(`document.querySelector('#${section} h1, #${section} h2').getBoundingClientRect().top >= document.querySelector('.navigation').getBoundingClientRect().bottom`));
  }
  await evaluate("document.querySelector('.skip-link').focus()");
  await key('Enter', 'Enter', 13);
  check('Skip link moves focus to main content', await evaluate("document.activeElement.id === 'main'"));
  check('Reduced motion leaves no active animations', await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches && document.getAnimations().length === 0"));

  const links = await evaluate("[...document.querySelectorAll('a[href]')].map(a => ({href: a.getAttribute('href'), download: a.hasAttribute('download')}))");
  check('Email and phone match resume', links.some(l => l.href === 'mailto:srivelansv2006@gmail.com') && links.some(l => l.href === 'tel:+919363632341'));
  check('GitHub and LinkedIn match resume', links.some(l => l.href === 'https://github.com/SRIVELAN-CSE') && links.some(l => l.href === 'https://www.linkedin.com/in/srivelan-m-0693343a7/'));
  check('All internal anchors resolve', await evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].every(a => document.getElementById(a.hash.slice(1)))"));
  check('Unique IDs and six certifications', await evaluate("new Set([...document.querySelectorAll('[id]')].map(e => e.id)).size === document.querySelectorAll('[id]').length && document.querySelectorAll('.featured-cert, .other-certifications li').length === 6"));
  for (const asset of ['style.css', 'script.js', ...links.filter(l => l.download).map(l => l.href)]) check(`Local resource responds: ${asset}`, (await fetch(`${base}/${asset}`)).ok);
  const downloads = resolve(output, `downloads-${Date.now()}`);
  await mkdir(downloads, { recursive: true });
  await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await evaluate("document.querySelector('a[download]').click()");
  const downloaded = resolve(downloads, 'Srivelan_M_Resume.pdf');
  for (let i = 0; i < 100; i++) { try { if ((await stat(downloaded)).size > 0) break; } catch {} await sleep(100); }
  const original = await readFile(resolve(root, 'assets/Velan_Resume_Updated.pdf'));
  check('Browser download produces the exact local PDF', (await readFile(downloaded)).equals(original));
  report.resumeSha256 = createHash('sha256').update(original).digest('hex');

  await call('Emulation.setScriptExecutionDisabled', { value: true });
  await viewport(zoom === 2 ? 1280 : 390, zoom === 2 ? 1000 : 844, zoom !== 2);
  await navigate();
  check('Without JavaScript all main sections and mobile links remain visible', await evaluate("[...document.querySelectorAll('main > section, .nav-links')].every(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e).opacity === '1') && !document.querySelector('#nav-links').hidden"));
  check('Without JavaScript layout has no horizontal overflow', await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  await evaluate("document.querySelector('summary').focus()");
  await key('Enter', 'Enter', 13);
  check('Without JavaScript native project details open with keyboard', await evaluate("document.querySelector('details').open"));
  await screenshot('no-javascript-mobile');
  await call('Emulation.setScriptExecutionDisabled', { value: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await navigate();
  await evaluate("document.getElementById('about').scrollIntoView()");
  await sleep(750);
  check('Scroll reveal settles with visible content', await evaluate("[...document.querySelectorAll('[data-reveal]')].every(e => getComputedStyle(e).opacity === '1')"));
  }
  check('No browser JavaScript exceptions', errors.length === 0);
  report.exceptions = errors;
  report.checkedAt = new Date().toISOString();
  await writeFile(resolve(output, auditOnly ? 'verification-contrast.json' : zoom === 2 ? 'verification-zoom200.json' : 'verification.json'), JSON.stringify(report, null, 2));
  console.log(`Completed ${report.checks.length} checks. Screenshots and report: ${output}`);
  await call('Browser.close');
} finally {
  ws?.close();
  browser.kill();
  server.close();
}
