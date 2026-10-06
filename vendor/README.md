# Vendored files

`readme.html` used to load these from CDNs. They are copied here, byte for byte, so the page can
run under a Content-Security-Policy of `script-src 'self'` and so a CDN or package change cannot
alter what runs on this origin.

| File | Source | Upstream hash check |
| --- | --- | --- |
| `marked-15.0.12.min.js` | https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js (the version the unpinned `marked/marked.min.js` URL served when it was replaced) | sha256 `Pn59f+s+XVjLbIBPaKtcJMx+XrYnD9bly7kSRzkhfQw=`, as listed by `https://data.jsdelivr.com/v1/package/npm/marked@15.0.12/flat` |
| `github-markdown-css-5.8.1.min.css` | https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown.min.css | sha512 `BrOPA520KmDMqieeM7XFe6a3u3Sb3F1JBaQnrIAmWg3EYrciJ+Qqe6ZcKCdfPv26rGcgTrJnZ/IdQEct8h3Zhw==`, as listed by `https://api.cdnjs.com/libraries/github-markdown-css/5.8.1?fields=sri` |

Both are MIT licensed; their license texts are in `LICENSE-marked.md` and
`LICENSE-github-markdown-css.txt`.

To update one, download the new version from the same source, check its hash against the
publisher's listing, replace the file, and change the file name in `readme.html`.
