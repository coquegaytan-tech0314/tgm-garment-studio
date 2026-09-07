# Validation — TGM v5, 2026-09-06

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
