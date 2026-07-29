🇯🇵 [日本語](./README.md)

# Markdown Editor

A lightweight, simple Markdown (`.md`) editor that runs entirely in your browser. No build step, no app store — it's a PWA (Progressive Web App) that works the same way on Chromebook, Windows, Mac, and Linux.

**🔗 Live demo: https://sho-ai-magic.github.io/markdown-editer/**

Write Markdown on the left and see it rendered instantly on the right. A formatting toolbar lets you insert bold, headings, lists, and more without memorizing syntax. With generative AI making Markdown round-trips more common, it also includes a character/approximate-token counter and a "copy as rich text" button that pastes cleanly into Google Docs and similar apps.

## Features

- **Tabs**: open and edit several Markdown files at once, switching between them freely
- **File explorer**: switch the sidebar from the table of contents to a folder tree and click any Markdown file inside to open it in a new tab (Chrome/Edge only)
- **Save version history**: every save records a snapshot of the previous content, restorable with one click from the "History" button (kept in memory for this tab and this session only)
- **Auto-save**: when enabled in Settings, files are saved automatically 3 seconds after you stop typing (only for tabs that already have a save location)
- **Find & replace**: Ctrl+F to search, Ctrl+H to replace, with matches highlighted in the editor
- **Resizable panes**: drag the borders between the sidebar, editor, and preview to your preferred widths (remembered across restarts)
- **Print-friendly**: Ctrl+P prints just the rich preview, cleanly — also handy for saving as PDF
- **Split-pane editing with live preview** (including pipe tables)
- **Formatting toolbar**: bold, italic, strikethrough, headings, bullet/numbered lists, task lists, blockquotes, code, tables, and links — all one click away
- **Lightweight syntax highlighting** for headings, lists, quotes, and code (colors are customizable)
- **Character / approximate token counter**: gauge your text length before pasting into an AI chat (computed entirely locally, no network calls)
- **Copy as Markdown or as rich text**: one click to copy the raw Markdown, or copy formatted HTML that pastes with headings, bold text, and tables intact into Google Docs, Word, etc.
- **A richly designed live preview**: hero-style headings, callout-style blockquotes, styled tables and code blocks — a magazine-like reading experience, with customizable accent colors
- **Switch between editor-only, split, and preview-only** layouts with one click, so you can use the full width for whichever you're focused on
- **Table of contents sidebar**: click any heading to jump both the editor and the preview to that spot
- **Light / dark theme** toggle, remembered across restarts
- **Open / Save / Save As** (Ctrl+O / Ctrl+S / Ctrl+Shift+S), plus drag-and-drop to open files
- **File association**: double-click a `.md` file to launch straight into it (once installed as a PWA)
- **Mobile-friendly**: on phones, the table of contents becomes a slide-out drawer and the editor/preview switch via tabs instead of a cramped 3-column layout
- **Works offline** once installed as a PWA

## Usage

### 1. Install it as an app (recommended)

1. Open the demo URL above in Chrome or Edge
2. Click the install icon at the right of the address bar
3. Choose "Install" — an icon is added to your desktop or shelf (on Chromebook)

Once installed, it launches and works without an internet connection.

### 2. Make `.md` files open with a double-click

1. Install the app as described above
2. In your OS's file manager, right-click a `.md` file → "Open with" → choose this app, and check "Always use this app"

From then on, double-clicking a `.md` file opens it in this editor (works with the ChromeOS Files app as well as "Open with" on Windows/Mac).

### 3. Basic operations

| Action | How |
|---|---|
| Open a file (adds a new tab) | Toolbar "Open" / Ctrl+O / drag & drop onto the window (supports selecting or dropping multiple files at once) |
| New tab (blank file) | The "+" button on the tab bar |
| Close a tab | Each tab's "×" button (prompts a confirmation dialog if there are unsaved changes) |
| Save | "Save" / Ctrl+S (applies to the active tab) |
| Save As | "Save As" / Ctrl+Shift+S (applies to the active tab) |
| Auto-save | Turn on "Auto-save" in Settings (saves 3 seconds after you stop typing, for tabs with a save location) |
| Find / Replace | The magnifier buttons on the formatting toolbar, or Ctrl+F / Ctrl+H |
| Print / save as PDF | "Print" button / Ctrl+P (prints only the preview content) |
| Resize panes | Drag the borders between the sidebar, editor, and preview |
| Editor font size / line height | "Settings" → "Editor" section |
| Bold / Italic | **B** / *I* buttons above the editor, or Ctrl+B / Ctrl+I |
| Heading | **H** button (cycles H1 → H2 → H3 → none on each click) |
| Bullet / numbered / task list, blockquote | Each has its own button (applies to selected lines; click again to remove) |
| Code | Code button (multi-line selection becomes a fenced code block, single line becomes inline code) |
| Table / Link | Each has its own button (link inserts with the URL portion pre-selected for quick editing) |
| Copy Markdown source | "Copy" button |
| Copy as rich text | "Rich text" button (pastes with headings/bold intact into Google Docs, etc.) |
| Restore a previous saved version | "History" button (recorded on every save; a restore only updates the editor, save again to write it to disk) |
| Open a file from a folder | Switch the sidebar to "Files" → "Open Folder" → click a file in the tree (Chrome/Edge only) |
| Toggle the sidebar (contents / files) | "Sidebar" button |
| Undo / Redo | The arrow buttons on the formatting toolbar, or Ctrl+Z / Ctrl+Y |
| Switch editor/preview layout | The three buttons on the right of the toolbar (editor-only / split / preview-only; hidden on mobile, where the editor/preview tabs already do this) |
| Customize colors | "Settings" button — covers heading/list colors as well as the preview's accent colors ("Reset to defaults" restores the originals) |
| Toggle theme | Sun/moon icon button |

An unsaved-changes dot (●) appears next to a tab's name, and closing that tab — or closing the app — with unsaved changes prompts a confirmation dialog.

The folder opened in the file explorer is remembered — after a reload, a "reopen last folder" button restores it (the browser shows a one-time permission prompt). The save version history is kept in memory for the current session only and is lost on reload.

The "N characters / ~M tokens" indicator in the toolbar is a rough guide for pasting into AI chat tools. It isn't a real tokenizer — it estimates using "1 character ≈ 1 token" for full-width characters (e.g. Japanese) and "4 characters ≈ 1 token" for ASCII text, so actual token counts will vary.

## Browser support

| Browser | Support |
|---|---|
| Chrome / Edge (ChromeOS, Windows, Mac, Linux) | Full support |
| Firefox / Safari | Editing and preview work; saving falls back to file downloads, and file-association launch isn't available |

## Self-hosting / forking

Fork this repository to run your own copy on GitHub Pages:

1. Fork the repo
2. In your fork, open **Settings → Pages**
3. Set "Build and deployment" **Source** to **GitHub Actions**
4. Pushing to `main` triggers `.github/workflows/pages.yml`, which deploys automatically to `https://<your-username>.github.io/<repo-name>/`

To try it locally, no build step is needed — just serve the directory:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Tech stack

- A build-free static web app (vanilla JS). Serve `index.html` over HTTP and it just works
- Editor: [CodeMirror 5](https://codemirror.net/5/) (MIT licensed, vendored under `vendor/`) — chosen for solid IME support and zero build requirements
- Markdown rendering: [markdown-it](https://github.com/markdown-it/markdown-it) (MIT licensed, vendored under `vendor/`)
- Offline support via a Service Worker (`sw.js`) — bump `CACHE_VERSION` in that file whenever you update the app's assets
- File I/O uses the File System Access API for in-place saves on Chromium browsers, with a download-based fallback elsewhere

## Contributing

Bug reports and feature requests are welcome via Issues. As this is a solo project without an established review process yet, I'm not accepting Pull Requests at this time.

## License

MIT License. See [LICENSE](./LICENSE) for details.
