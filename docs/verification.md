# Verification

## Outfit maker update

- Frontend production build passed.
- Java Spring Boot package passed.
- JavaScript matching suite: 16 tests passed.
- Backend integration suite: 10 tests passed against isolated in-memory H2 databases.
- Regression checks cover dress styles, T-shirt eligibility, formal exclusions, shirt/pants/shoe anchors, occasion restrictions on all items, unavailable items, optional footwear, alternative-combination variety, recent wear, history, archive, and backup restoration.
- Phase-one schema migration tested with preserved wardrobe, laundry status, and wear records. Migration ran twice successfully. Format-1 backups remain restorable; format-2 backups preserve dress styles.
- Live startup was checked using a copy of the pre-update file database before installation.
- Browser checked the default outfit-maker opening screen, formal/office selection, item editor, T-shirt style options, and responsive empty-wardrobe guidance.
- Desktop checked at 1440 pixels and mobile at 390 pixels. Document width matched viewport width at both sizes.
- The existing wardrobe was empty during manual browser testing, so populated combinations were covered by matching tests rather than a manual populated-wardrobe browser walkthrough.
- The phase-one browser-upload permission refusal was respected; no workaround upload was attempted. Photo validation remains covered by backend tests.

Java 26.0.2.1 was used on this machine; Java 21 remains recommended for Spring Boot 3.5.

## Bulk photo importer

- JavaScript suite: 20 tests passed, including crop bounds, reverse dragging geometry, malformed/low-quality detections, duplicate suppression, and selection limits.
- Spring Boot suite: 13 tests passed. Batch tests cover independent saved items, replay without duplicates, changed-payload rejection, invalid/oversized requests, and rollback of both rows and request reservation on a database failure.
- Local model check used the user's supplied group photo, resized to the importer's 2000-pixel limit. Seven individual pants crops were proposed by the pinned Grounding DINO Tiny q8 model. Cached inference in the Node CPU test took about 10 seconds; this is not a browser performance guarantee. The photograph and downloaded weights were not added to the repository.
- The category chooser and upload entry screen were checked in the browser, including a 390-pixel mobile viewport with no horizontal overflow. A full file-upload/save browser walkthrough was not performed because the earlier browser upload refusal remains respected. Crop persistence and retry behavior were verified through isolated backend tests; the browser worker was production-bundled but its inference path was not manually exercised.
- New library dependencies were checked with npm audit: zero known vulnerabilities at the time of verification.
- Automatic detection is not guaranteed for all layouts, folds, lighting, or categories. Manual draw/adjust/exclude controls remain available, including when model download or inference fails. Crops are rectangular photographs, not background-free silhouettes.

## Mixed categories, fine rotation, fit and shade update

- 27 JavaScript tests passed; 14 backend tests passed, including garment metadata edit/backup/restore. Production builds passed.
- Each crop can have its own category and style tags. Fine rotation includes typed angles and ±1°/±5° controls alongside ±90°.
- Fit/type are confirmed by the user; style suggestions are rules based on those details, not visual garment classification. Shade/hex estimates use photo samples and remain editable.
- An offline database copy was taken before migration. The installed database has 10 items, all with shade estimates; seven pants retain their existing IDs and photos.
- Existing manual browser upload limitations remain; no complete upload-to-save browser walkthrough is claimed.
