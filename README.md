# DartPoints cross-connect ordering page

A single static page where customers enter everything on the **DartPoints Cross-Connect Checklist**, check it in a live diagram, review it, and then either send it (once a form service is connected) or download/print the completed checklist.

There's no build step and no dependencies. Every path is relative, so the site works at a project URL such as `https://<owner>.github.io/<repo>/`.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The page |
| `assets/js/config.js` | **The only file you edit to go live.** Sets the order endpoint and the facility list |
| `assets/js/app.js` | Form logic: validation, live diagram, review, sending, download/print |
| `assets/css/site.css` | Styles, including the print layout |
| `assets/fonts/` | Archivo (self-hosted, SIL Open Font License, see `OFL.txt`) |
| `assets/img/` | DartPoints logo (from the checklist) and favicon |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

## Before real orders can be received

The page **does not send orders yet**. GitHub Pages only serves static files and can't receive or store form submissions. Until `orderEndpoint` is set, the review step tells customers that online ordering isn't connected yet and offers **Download checklist** and **Print or save as PDF**. The page never says an order was sent unless the order service returns a success response.

### 1. Add the facility list

In `assets/js/config.js`, fill in `facilities`:

```js
facilities: [
  { name: "Facility name", address: "Street, City, State ZIP" },
],
```

While the list is empty, **Location address** is a free-text field.

### 2. Connect a form service (recommended: Formspree)

1. Create a Formspree account and a new form. Set it to deliver to the mailbox that handles cross-connect orders.
2. Copy the form endpoint (it looks like `https://formspree.io/f/xxxxxxxx`).
3. Paste it into `assets/js/config.js`:
   ```js
   orderEndpoint: "https://formspree.io/f/xxxxxxxx",
   ```
4. Commit, push, and send one test order from the published site. Confirm the email arrives.
5. Check Formspree's current plan limits, and set any domain restriction or spam settings your plan offers.

The endpoint is not a secret. Anyone can see it in the page source, and it only accepts submissions. Don't put an API key, password or email address in `config.js`.

**What gets sent:** a standard form POST (`multipart/form-data`, `Accept: application/json`). The field names match the checklist (`Location Address`, `Carrier`, `Carrier Rack Location`, `Carrier Device Info and Port(s)`, `Carrier Circuit ID`, `Customer Rack Location`, `Customer Device Info and Port(s)`, `Media Type (Copper or Fiber)`, `Fiber Type`, `Fiber Connector Types`), plus `Contact Name`, `Company`, `email`, `Phone`, `Notes`, `Information Confirmed`, `_subject`, and a `_gotcha` spam trap. Formspree uses `email` as the reply-to address.

**Other services:** any https endpoint that accepts a multipart form POST from a browser (with CORS) and returns a 2xx status will work. A Power Automate "When an HTTP request is received" flow is possible, but it's a premium trigger, its signed URL becomes public in the page source, and it needs a flow that parses multipart form data. That route wasn't tested.

## Publish with GitHub Pages

1. Put the contents of this folder at the **root** of the repository. `index.html` should be at the top level, next to `.nojekyll`.
   ```powershell
   git clone https://github.com/<owner>/<repo>.git
   Expand-Archive -Path .\dartpoints-cross-connect.zip -DestinationPath .\<repo>
   cd <repo>
   git add -A
   git commit -m "Add cross-connect ordering page"
   git push
   ```
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**. Set **Branch** to `main` and the folder to `/ (root)`, then click **Save**.
4. Open the **Actions** tab and wait for **pages build and deployment** to finish.
5. Open `https://<owner>.github.io/<repo>/` and check that the logo and fonts load. Then fill in the form, review it, and download the checklist.

Notes:
- If the Pages settings aren't available, your organization may restrict Pages, or the repository may be private on a plan that doesn't include Pages for private repositories.
- A custom domain is optional (**Settings → Pages → Custom domain**). All paths are relative, so the site works either way.

## Test locally

Serve the parent folder so the page runs under a subpath, as it will on GitHub Pages:

```powershell
cd ..
python -m http.server 8000
# open http://localhost:8000/<this-folder-name>/
```

## Where the content comes from

From the checklist: the logo, the ten checklist items and their order, "Copper or Fiber", and the statement about incomplete or incorrect information causing delays and additional installation fees.

Added for the online form (not in the checklist):
- Contact fields (name, company, email, optional phone) and optional notes
- The fiber type options (Single-mode, Multimode, Other) and connector options (LC, SC, MPO/MTP, ST, FC, Other). Connector type is asked separately for the carrier end and the customer end
- The confirmation checkbox, which restates the checklist's warning
- "Pricing is confirmed by DartPoints." The page shows no prices

To change any wording, edit `index.html`. Error messages and the download format are in `assets/js/app.js`.
