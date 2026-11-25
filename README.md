# HTML Runner

Static page for GitHub Pages: upload a single `.html` file and run it.

- `/upload/` — pick a file. It is saved in the browser's IndexedDB, then you're sent to `/`.
- `/` — runs the saved file full-screen (in an iframe). With nothing saved, it redirects to `/upload/`.

The file survives reloads and return visits. It is stored only in that browser on that device. Nothing is sent to a server.

To change the file, go to `/upload/` in the address bar.

## Limits

- Single-file HTML only. Relative assets (`./style.css`, `img/x.png`) won't load; use inlined or CDN assets.
- The uploaded file runs as code on this site's origin, so only upload files you trust.
- iOS Safari may wipe site storage if the site isn't opened for about 7 days. Adding the page to the Home Screen avoids that.

## Deploy

1. Create an empty GitHub repo and push this folder to `main`.
2. Repo → Settings → Pages → Source: *Deploy from a branch*, Branch: `main` / `(root)`.
3. Open `https://<user>.github.io/<repo>/upload/`.

## Local test

```
python -m http.server 8000
```

Then open <http://localhost:8000/upload/>. ES modules need http, so `file://` won't work.
