# Smart Wardrobe · Thread & Tone

A personal wardrobe assistant built with HTML, CSS, JavaScript, React JS, Java, Spring Boot, JDBC, and SQL. Photograph your own shirts, pants, and shoes; choose a piece; discover combinations from the clothes you actually own; and remember when and where you wore them.

## Start the application

On this Mac, open `Start Wardrobe.command` in the project folder. Alternatively, open a terminal in this folder and run `npm start`.

The launcher builds the interface and Java backend, then serves the complete application at http://127.0.0.1:8080. Keep the terminal open. Press Control+C to stop it. Your saved wardrobe remains in the database after stopping or restarting.

For a fresh checkout, install Node.js 22.12 or later and a Java JDK (21 recommended), then run `npm ci` followed by `npm start`. Maven is downloaded automatically by the included official wrapper. Internet access is needed for the first dependency download; application photos and matching remain local. The current machine's Java 26 also passed the automated checks, but Java 21 is the recommended supported runtime for Spring Boot 3.5.

Port 8080 must be free. If another application uses it, stop that application before launching this one. Only run one copy against the database at a time.

## Outfit maker update

The app opens directly in **Outfit maker**. Select a dress style—Formal, Semi-formal, Casual, or Traditional—and choose where you are going. Available wardrobe pieces are matched using both selections.

Choose a shirt or T-shirt under **Shirts & tops** to keep it in every suggested look, or choose **Pants** to generate suitable tops around those pants. **Shoes** can also be the starting piece. Multiple combinations appear below; selecting one previews it above, where **Wear this** records its date, occasion, and dress style. Shoes are included when suitable ones exist; top-and-pants outfits are still available without them.

Supported top types are Shirt, T-shirt, Hoodie, and Traditional. Traditional means a top such as a kurta; this version still pairs it with an item stored under Pants. One-piece traditional garments and layered outfits are outside this iteration.

Use **Dress styles** in the item editor to describe suitability. Formal permits tagged shirts, pants, and shoes. Semi-formal additionally permits suitably tagged T-shirts. Hoodies are casual-only, and Traditional tops are used for traditional looks. These are wardrobe rules, not automatic recognition of garment formality. Tag jeans as Casual and dress trousers or shoes as Formal/Semi-formal as appropriate.

Existing phase-one clothes are preserved and start with a Casual tag. Edit those tags to make suitable pieces eligible for other dress styles. A selected item must also fit the occasion; the app explains conflicts rather than silently substituting it. Backup format 2 includes dress styles; phase-one format 1 backups remain restorable. Database migration adds fields and expands the category constraint without removing records.

Clothing labels are optional and default to the color and category. Pattern is no longer a required UI field; existing pattern data remains stored. Group-photo importing is available through **Import group photo**.

## Import clothes from one group photo

Manual selection is now the default and requires no model download or scan.

1. Choose Import group photo, select the category, and open your photo.
2. Click Add box. Drag it over a garment and resize with its corner handles. Draw a box and numeric bounds are also available.
3. Rotate left or right to turn the individual crop in 90-degree steps. Confirm its color and optional label.
4. Click Save this piece, then continue with another box from the same photo. Saved boxes are marked and cannot be saved twice. Save all selected pieces is also available.
5. Click Done when finished. Saved clothes remain in My wardrobe; unsaved boxes are discarded when closing.

Failed saves retain their request identifier for a safe retry. The earlier automatic model source is preserved but is not loaded by this flow or bundled into the active interface.

## Use your wardrobe

1. Select **Add item** and choose a JPEG, PNG, or WebP photo. Browser uploads accept images up to 15 MB and resize them to a maximum of 1000 pixels before saving.
2. Optionally give the item a label. Confirm its category, main color, dress styles, and occasions. The app estimates the main color from the photo center; edit it when lighting or background affects the estimate.
3. Add at least one top and one pair of pants. Add shoes when available.
4. Open **Outfit maker**, select your occasion, and choose a favorite item under **Start with a favorite**. Alternatively, select **Style this** on any available wardrobe item.
5. Review matching combinations and use **Try another** for alternatives. **Wear this** records the outfit, occasion, and wear date/time. Past dates are supported; future dates are rejected.
6. Mark individual pieces for laundry from their cards or wear journal entries. Use **Back to wardrobe** when they are ready again.
7. Check the last-worn label or **Wear details** for an item's dated, occasion-specific history. Washing, renaming, and archiving never erase recorded wears.

Shoes have independent availability controls; the application does not assume they need washing after each wear. Recording an outfit does not automatically mark it for laundry.

## Matching behavior

Suggestions use only your available, unarchived clothes. Each combination contains one top and one pair of pants, plus suitable shoes when available. Rules consider color compatibility, patterns, occasion tags, recent wears, and optional preferred colors. An explanation accompanies each suggestion.

An **Everyday** tag makes an item eligible across occasions. Every piece, including a selected starting item, must fit the dress style and suit the occasion or have the Everyday tag.

The app ranks up to 20 candidates in each category and shows the best 30 combinations. It prioritizes variety without preventing you from repeating a favorite. If a category is missing, all suitable items are in laundry, or no full outfit meets the occasion, it explains the missing combination rather than inventing clothing.

Color matching is a transparent rule-based system, not automatic fashion recognition. Optional favorite colors personalize ranking. There is no single Indian skin tone or universally correct palette, and the app does not infer a user's skin tone or appearance.

## Storage and backups

The Java backend uses JDBC with an embedded, file-based H2 SQL database. Data is stored in `backend/data/wardrobe.mv.db`, including clothing photos, item metadata, wear events, and laundry transitions. No separate SQL server or cloud account is required.

Use **Preferences & backup → Download backup** to save a portable copy of clothing photos and wear history. **Restore from backup** adds missing records and skips identifiers that already exist. It does not overwrite newer existing records. Invalid imports are rolled back as a transaction. The restore interface accepts backups up to 100 MB, 1000 items, and 10,000 wear events.

For larger collections, stop the app and copy the entire `backend/data/` folder to back up the database. Never copy or edit the database while the app is running. Keep photo backups private.

Name and favorite-color preferences are saved in the current browser and are not included in the wardrobe backup. The original prototype's browser-storage keys are preserved but are not automatically imported: its sample items did not have real clothing photos or stable wardrobe identifiers.

## Project layout

- `src/App.jsx` — application views and wardrobe interactions.
- `src/components/` — outfit maker, reusable icons, dialogs, item editor, and wear recorder.
- `src/workers/clothing.worker.js` — background clothing detection, isolated from the interface.
- `src/lib/bulk-*.js` and `src/lib/segment-clothes.js` — crop geometry, color estimation, and local model integration.
- `src/lib/wardrobe.js` — matching, last-worn calculations, image processing, and API client.
- `src/App.css` — responsive desktop and mobile styling.
- `backend/src/main/java/com/smartwardrobe/` — Spring Boot application, API, JDBC store, validation, and local-access filter.
- `backend/src/main/resources/schema.sql` — SQL tables and constraints.
- `backend/src/main/resources/application.properties` — local server and database configuration.
- `backend/src/test/` — backend integration tests with a temporary in-memory SQL database.
- `backend/mvnw`, `backend/mvnw.cmd`, and `backend/.mvn/` — official Maven wrapper.
- `tests/wardrobe.test.js` — matching and calendar-day regression tests.
- `scripts/start.mjs` — complete application launcher.
- `docs/` — original report and original setup notes.
- `docs/archive/prototype-before-implementation/` — preserved application files from before this implementation.

Generated folders are kept separate: `dist/` for the frontend build, `backend/target/` for Java build output, `backend/.cache/` for local build dependencies, `backend/data/` for personal data, and `node_modules/` for installed frontend dependencies. They are excluded from version control.

## Development and checks

Run `npm test` for the matching tests. Run `npm run test:backend` for the Java integration tests. Run `npm run build` to compile the frontend. `npm start` builds both parts and runs the complete application.

For interface development, start the backend using `cd backend` and `./mvnw spring-boot:run`, then run `npm run dev` from the project root in a second terminal. The frontend development server is at http://127.0.0.1:5173 and proxies API requests to port 8080. `npm run preview` serves the built frontend on port 4173 and also requires the backend.

The backend tests cover the full record-wear/laundry/return/rename flow; invalid photos, duplicate or incomplete outfits and future dates; archive/restore; backup round-trips without overwriting; failed-import rollback; and rejected cross-origin writes. Matching tests cover ownership, occasion tags, all three anchor categories, laundry and archive exclusions, recent-wear ranking, missing categories, and calendar-day labels.

See `docs/verification.md` for the actual verification results and limitations of browser testing.

## Current scope and phase two

This is a local, single-user application. It binds to the loopback address and does not include accounts, public hosting, multi-user authorization, or cloud synchronization. It has no paid AI service dependency. Bulk photo selection uses an open-source image model downloaded on first use; inference runs on the device.

Bulk importing from a group photo is implemented. Batch selection of several separate photo files remains a future convenience feature. Automatic selections are suggestions, not a guarantee: review them before saving. Hidden fabric cannot be recovered from overlapping garments; crops retain the original photograph and its background.

## Technical references

- [Grounding DINO Tiny ONNX model and Apache-2.0 license](https://huggingface.co/onnx-community/grounding-dino-tiny-ONNX)
- [Transformers.js](https://huggingface.co/docs/transformers.js/index)
- [Spring Boot file uploads](https://spring.io/guides/gs/uploading-files/)
- [Spring SQL and JDBC support](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [H2 SQL database](https://h2database.com/html/main.html)
- [Browser image pixel processing](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)

## Mixed crops, fine rotation, fit and shades

Every crop has its own category, garment type, fit, shade and dress styles. Use the initial category buttons only to set a default for new boxes. Rotation supports 90-degree shortcuts, ±1°, ±5°, and a typed angle. Styles are suggested from category, confirmed garment type and fit, rather than claimed visual recognition. Fit cannot be reliably inferred from a flat photograph; choose it explicitly. Unknown details stay marked Unknown.

Shade estimates use sampled fabric colors and remain editable because lighting and backgrounds affect photographs. Existing saved items receive shade/hex estimates through an additive migration. Their IDs, photos, history, and availability are retained. Outfit ranking uses shade contrast and fit compatibility; an oversized/relaxed top with skinny pants is excluded under the current fit preference. Separate items retain their own IDs even when their shades are similar.

## Automatic outfit style and stacked previews

Untouched style tags now use automatic mode: category, photo shade/contrast, garment type and fit determine eligibility and ranking. Explicit manual style selections take precedence. Formal favors neutral colors, light/dark contrast and restrained patterns; semi-formal uses a smart neutral base with softer contrast; casual favors relaxed pieces and flexible palettes. Unknown garment construction produces provisional color-led suggestions, not a claim of image recognition. Confirm Jeans versus Dress trousers to enforce a dress code. Legacy lone Casual defaults are treated as automatic; select manual mode to retain an intentional restriction.

Outfit previews stack the top above pants and shoes, including combination cards. These use original garment photos rather than reconstructing a person wearing them.


### Photo-based garment types and strict Formal eligibility

Formal outfits require a Dress shirt and Dress trousers; optional shoes must be Dress shoes. Unknown garments, jeans, chinos, joggers and shorts cannot become Formal through a manual style tag or matching color. This restriction also applies when recording an outfit on the server.

Photo recognition uses CLIP image/text comparisons locally in a browser worker. Single uploads and individual bulk crops are checked after a short debounce. Previously saved items with unknown types are checked sequentially on opening the app. Photos stay on the device; the first use downloads model weights from Hugging Face and can take substantially longer than later runs. Failure or uncertainty leaves the item outside Formal. Existing manually chosen types are preserved. Edit → Garment type corrects a prediction; Check photo again retries recognition.

Predictions are estimates, not guarantees. Conservative score and margin thresholds (with a stricter formal threshold and denim veto) reduce unsafe formal suggestions; scores are similarity scores, not calibrated confidence probabilities. Fit is still user-confirmed. This does not add background removal.

The app uses Semi-formal as its existing smart-casual label, allowing jeans there. Strict event semi-formal dress codes may require a suit. Construction gates run before color ranking: neutral colors do not turn denim into formal trousers.

References: [CLIP model and Transformers.js usage](https://huggingface.co/Xenova/clip-vit-base-patch32), [model limitations](https://huggingface.co/openai/clip-vit-base-patch32), [casual chinos and denim](https://www.brooksbrothers.com/mens/casual-pants).
