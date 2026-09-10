# TGM Garment Studio — V8

V8 adds multi-garment project files without breaking the existing single-pedido workflow.

## Required compatibility

- `tgm-project` version 1: opens a complete project with multiple garments/variants.
- `tgm-pedido` versions 1–8: opens standalone current and historical orders.
- Existing local/cloud order storage remains available; V8 does not create an incompatible replacement namespace.
- V7 pricing and private manufacturing-cost fields remain optional when older orders are imported.

## CUMBRES — RHINOS

The V8 project workflow is designed to import `CUMBRES_RHINOS_Proyecto_v8.json` as one project and display all 12 variants:

1. Polo Blanco
2. Polo Negro
3. Polo Amarillo
4. Hoodie Blanco
5. Hoodie Negro
6. Hoodie Amarillo
7. Top Blanco
8. Top Negro
9. Top Amarillo
10. Cierre Corto Blanco
11. Cierre Corto Negro
12. Cierre Corto Amarillo

Use **Proyecto completo** → **Importar proyecto JSON**. Each card can be opened as an editable pedido while retaining its project identity, price/cost fields, references and preview metadata.

Top/cierre variants may use a generic editable garment base until dedicated production-pattern bases exist. Their received reference images and project preview remain the visual source of truth; the app must not imply that a generic base validates the final pattern.

## Historical orders (example: KROM)

Use the normal **Importar JSON** or **Abrir** workflow. A historical V6 KROM pedido is validated by the same migration chain and loaded into the V8 in-memory schema. Missing V7/V8 fields such as pricing, costing and project membership are initialized safely rather than treated as errors.

## Release checks

Before merging V8:

- Build `dist/index.html` from `photostudio/build.py`.
- Run the existing audit/edge/pricing/cloud tests with V8 migration expectations.
- Run `tests/v8-projects.cjs` to verify KROM-style V6 migration and a 12-garment CUMBRES–RHINOS project.
- Confirm generated UI contains `ESTUDIO · v8`, `Proyecto completo`, and `PROJECT_SCHEMA='tgm-project'`.

Firebase Hosting serves `dist/`, so V8 is not deployable until the generated `dist/index.html` has been rebuilt and committed.
