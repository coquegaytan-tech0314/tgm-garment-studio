# Validation — TGM v7, 2026-09-09

## Price and internal cost update

The 24 existing regression groups and five pricing/cost groups pass against the assembled app, plus the existing cloud-helper suite. Tests execute real app event handlers, storage functions and native Canvas 2D, using synthetic values only. No real customer data or network uploads are used.

- Price entry supports decimal point/comma, blank versus explicit zero, fractional cents rejection, bounds and exact integer-cent multiplication across the full S–XXL quantity range.
- Saving, reopening, JSON download and the existing cloud-pedido serializer retain price, currency, conditions and optional manufacturing costs. Cloud serialization is tested with an in-memory SDK, not a live Storage round-trip.
- New/older pedidos start with blank prices and costs. v1–v6 migration and malformed v7 price/cost imports are covered. Pricing edits do not invalidate the garment's visual signature.
- Client PDF/print pricing is opt-in; the internal ficha retains selling price. Cost totals remain partial until all categories have been entered, and never change the selling price.
- The actual full ficha renderer is exercised with distinct internal-cost notes, checking that they and the cost subtotal are absent. Client specification text, native print and caption paths also exclude internal cost notes.

These checks do not certify every browser, live cloud configuration or physical iOS/Android device. The earlier browser-upload and download limitations below still apply. The optional cloud feature was already present on main when this update began; its access rules, Firebase configuration and hosting settings were preserved.

## Retained v6 validation — 2026-09-07

## Current result and scope

24 regression groups pass against the built standalone app: 14 in `tests/audit.cjs` and 10 in `tests/edge-cases.cjs`. Run `python3 photostudio/build.py`, then `npm test` after installing the development dependencies. The harness executes the delivered JavaScript in a Node VM with a minimal DOM and native Canvas 2D. A separate interactive Chrome session exercised the visible application. These checks establish the covered behavior; they do not guarantee an absence of bugs or certify unattended operation on every device.

The code update is prepared on a separate review branch. This audit does not deploy Firebase, merge main, add authentication or publish customer material.

| Area | Evidence |
| --- | --- |
| Controls | Every static button has a click handler. Exercised all eight tabs, keyboard tab navigation, garment/default changes, colors, contrasts, fabric and construction fields, quantities, QC and internal reference fields. Handler presence alone is not claimed as end-to-end validation of every button. |
| Artwork | Actual PNG, JPG and SVG ingestion; original-file retention; reversible light/dark background removal, crop, restoration and prepared/original download payloads; malformed and active SVG rejection. |
| Sleeves | Add, reuse, duplicate and delete applications; coordinates preserve their zone. Requested dimensions clear on reuse. Pixel checks verify the wearer's left/right sleeve for all three garments and both views. |
| Rendering | All six garment views and Serigrafía/Bordado/Sublimado paths; full-piece coverage; 2000 × 2300 garment and 1600 × 1300 sleeve output. White-panel rendering differs from dark-garment multiplication. Rapid changes coalesce with one active render. Image caches stay bounded. |
| Finished renders | Image ingestion, signature checks and rejection of exports after a visual change makes an imported render stale. Unsupported WebGL keeps the photo workspace usable. |
| Data validation | v1–v5 migration into v6; invalid schema/fields, dates, quantities, ranges, duplicate applications, unsafe images, and the 12-application/eight-reference limits. |
| Persistence | Mixed older localStorage order lists merge; quota failures stop replacement; edits stop stale asynchronous replacement; autosaved drafts are archived, including care-only and construction-only drafts. Failed IndexedDB opens retry and version changes close old connections. |
| Revision safety | Same-millisecond edits receive distinct revisions. Save-and-new waits for successful storage and preserves the current record on failure. |
| Exports | PNG, sleeve PNG, full JSON, client PDF, internal ficha, caption fallback and print preparation handlers. A native download link remains visible after generation. Long PDF labels fit inside their label column. |
| Boundaries | Workshop sublimation composition guard; exact attached PDF retention; internal notes and source filenames excluded from client specification text/caption. Uploaded image content itself is not redacted. |

## Current interactive Chrome checks

Loaded the existing synthetic v5 draft in v6, edited a black polo, collar/placket accents and sleeve text, selected Bordado and a requested dimension, entered a sample quantity and internal reference request, saved through Guardar pedido, and restored the record through the visible interface. Opened all eight tabs and the four-page synthetic reference preview. Checked front/back comparison, detail zoom, fit, side changes and dialog controls. Selecting Boceto 3D when WebGL was unavailable left Acabado usable after the fix.

The JSON button produced a visible native download link. Automatic PNG download completion events were not captured, including one longer retry; actual browser-saved bytes remain unverified. Native Canvas and PDF output generation was verified separately. No application-origin console errors or warnings were observed in the inspected session.

Browser file-chooser testing was not repeated after an earlier approval denial. No alternate browser upload path was used. Actual image/attachment ingestion was tested with the app's local functions. Physical iOS/Android file picking, touch dragging, local storage and download completion remain unverified. Responsive CSS and non-editing canvas scroll behavior were reviewed; the session did not emulate physical devices.

## Customer sample validation

Prepared the requested client sample outside the repository. Its v6 JSON passes the application's validator, retains seven artwork applications and seven reference attachments, and preserves all nine supplied original files byte-for-byte (SHA-256 comparison). Quantities, exact gsm, measured dimensions, owner, due date, production times and QC approval remain unset when unknown. The product options are PIQUE ATLANTE and POLO FOMER; actual composition and material properties are pending the factory's product sheets.

The editable render is a development reference, not a calibrated fit or production art. The client PDF lists the composition requested in the ficha, not a verified property of either proposed product. Generated the internal reference and one-page client PDFs using the app, rendered the actual PDFs with Poppler, and reviewed every page. Customer JSON, inputs, previews and PDFs are excluded from this repository.

## Current operating limits

- Local IndexedDB/localStorage remains the draft store. Optional Firebase Storage sharing was added after the v6 audit. Staff authentication and Storage rules are not tested by this pricing update; JSON backups remain separate.
- Local preview/export code and images are embedded; optional cloud sharing loads the Firebase SDK from its CDN and needs a network connection. Accessing a hosted address offline before it has loaded is not guaranteed. Changing file path, origin or browser may require importing a JSON backup.
- Cache limits and a serialized preview queue reduce repeated work; large orders still depend on device memory and browser quota. An interrupted tab or full disk can still require recovery from a backup.
- Photo masks, textile texture, bands, seams, thread relief, material appearance and artwork displacement are approximate. Fixed garment bases cannot validate measurements, semi-fitted pattern grading, exact physical color or cloth behavior.
- No embroidery digitizing, DST/EMB generation, production ink separations, cutting patterns, calibrated sublimation layouts, process settings or manufacturing guarantees are generated.
- PDFs are raster pages, without searchable text. Non-image attachments are listed in the internal PDF; exact originals remain in the full JSON.

## Earlier validation record — v5, 2026-09-06

## v5 sleeve changes

Executed the current standalone JavaScript in the retained DOM event harness with native Canvas 2D. Verified the dedicated Mangas tab, independent sleeve field events, original SVG ingestion/preparation/reuse, v5 order save and JSON round trip, migration of a v4 record without sleeve fields, invalid range rejection, visual-change invalidation of finished renders, and exclusion of private sleeve notes from client specs/caption.

Actual pixel checks covered playera, hoodie and polo in front/back views: the chosen wearer's sleeve changed color while the torso and opposite sleeve retained theirs. Generated and visually inspected sleeve bands and logo compositing. Exercised Serigrafía, Bordado and Sublimado render paths and generated a 1600 × 1300 sleeve PNG. Verified that sleeve-detail zoom follows the same wearer's side when switching views; Fit and general detail inspection reset the sleeve focus.

Generated a generic six-page internal reference PDF and a one-page client PDF using the app. Rendered the actual PDFs with Poppler; reviewed all pages, fixed a client-row label overlap, and rechecked affected pages. Verified the final page counts and A4 dimensions. The generic example uses an illustrative logo and no factory production quantities. Its JSON preserves original and prepared artwork, sleeve details and front/back placement.

In live Chrome, loaded the earlier synthetic test draft, opened Mangas, used Agregar texto aquí, entered TGM, and selected two bands on the left sleeve. Saved through Guardar pedido, reloaded, and confirmed TGM and Dos franjas through the visible interface. The preserved MUESTRA chest application remained available. The sleeve upload/text shortcuts are visible near the top of the panel. Screenshot included in previews/.

Validated unique static IDs, v5 schema and embedded assets. Checked ZIP integrity and rebuilt the standalone app from the packaged source. Browser file uploads were not attempted because of the earlier upload denial described below. Browser download completion and physical-tablet behavior remain unverified; actual local Canvas/PDF output generation was tested. Sleeve boundaries, bands, placement and texture are approximate, and independent sleeve colors/bands appear in Acabado rather than the older 2D/3D sketches.

## Retained v4 checks


## Local integration

Executed the actual delivered JavaScript in a Node VM with a DOM event harness and native Canvas 2D decoding/compositing, without WebGL.

Passed: PNG/SVG ingestion and normalization; exact original SVG retention; reversible background cleanup and transparent trimming; cropping from a supplied sublimation layout; body-piece mapping; all three technique render paths; full v4 JSON round trip; original PDF attachment retention; nested embroidery fields and measurements; v1–v3 migration; sublimation composition export blocking; numeric bounds and active SVG rejection; exclusion of synthetic internal fields from client specs/caption; localStorage fallback; and visible failure on simulated quota exhaustion.

Generated a generic four-page A4 internal reference PDF. Rendered the actual PDF with Poppler and visually reviewed all pages for wrapping and overlap. Independently generated and reviewed the preserved one-page client PDF. Production counts from the supplied embroidery worksheet were used only in local round-trip tests; they are not preloaded in the app or generic examples.

Earlier v3 checks covered dragging/keyboard movement, garment defaults, completed-render ingestion and stale-render blocking, transparent 2000 × 2300 output, contrast, detail zoom and legacy imports. These retained workflows were not all retested in v4.

## Live Chrome preview

Served the standalone app unchanged. Added synthetic MUESTRA text, selected Bordado, changed color, entered a sample reference request, saved the full pedido, reloaded, and reopened its named record through Abrir. Text, technique and reference request were restored. Opened the generated four-page reference dialog. The browser used the normal IndexedDB-capable storage path; persistence was verified through the UI, without direct database inspection.

Visually checked front/back preview, logo panel and reference dialog. A DOM layout check found no horizontal overflow in the inspected desktop reference view. Actual screenshots are included in previews/.

Browser upload testing was blocked by the approval system because upload permission was denied. No alternate browser upload path was used. File ingestion, processing and attachment retention were tested locally with the real app functions; the browser file-chooser path remains unverified.

Earlier browser export feedback reported ready output, but completed download events were not captured. Browser download completion and actual touch-device behavior remain unverified. Native Canvas/PDF checks establish output generation. Opening file:// on the user's device remains a final device check; the app has no fetch/CDN dependency and includes storage fallback.

## Practical limits

Garment bases and application effects are visual references. Full sublimation coverage uses approximate photo masks, not calibrated patterns. The app does not verify stitch feasibility, digitize logos, separate production inks, calculate transfer settings, simulate cloth or predict fit. Internal PDFs list non-image attachments; exact PDF/DST/EMB originals remain in the full JSON. Storage capacity depends on browser and device.
