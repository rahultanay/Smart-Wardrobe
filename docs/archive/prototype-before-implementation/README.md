# Smart Wardrobe

A personal wardrobe assistant that reduces the daily effort of choosing an outfit. Users photograph their own shirts, pants, and shoes, record when and where they wear them, and receive outfit suggestions using available items from their wardrobe.

## Project scope

Allowed technologies: HTML, CSS, JavaScript, React JS, SQL, JDBC, Spring.

Spring and JDBC require Java. Java must be approved as the supporting backend language before backend implementation begins. No additional application framework or AI service is required for the first version.

## Everyday workflow

1. Add a photo of each shirt, pair of pants, and pair of shoes. Confirm its category, main color, pattern, and suitable occasions.
2. Select an occasion such as college, office, a party, or visiting friends.
3. Pick an item. Suggest matching items from the user's own wardrobe, excluding items marked for laundry.
4. Record the outfit as worn, with its date, time, and occasion.
5. After use, mark individual items for laundry. Return them to available status after cleaning.
6. Show each item's last-worn date and elapsed days, with its previous occasion: for example, “Worn 5 days ago · College.” Also show previous uses of the complete outfit.

Laundry status and wear history are separate: washing an item must never erase its history. Shoes can be marked unavailable independently without requiring washing after every use.

## Current implementation

The existing React JS prototype displays four sample wardrobe items and three predefined outfits. It supports marking items for laundry, returning them to the wardrobe, recording outfits, and saving laundry and history in browser storage. It can warn about a previously worn combination.

Not yet implemented: personal photo uploads, editable wardrobe items, item-level last-worn labels, wardrobe-based matching, real occasion counts, user accounts, and SQL persistence. Some displayed counts are sample values. Settings and logout are placeholders. Current data stays in the current browser and is not a backup or a shared account.

## Feasibility

The core workflow is feasible with the allowed stack. React JS, HTML, CSS, and JavaScript handle the interface, photo selection, history labels, and initial matching rules. Spring can provide upload and wardrobe endpoints; JDBC can store and retrieve records in a SQL database, subject to approval of Java.

The first matching engine should use explicit color compatibility, occasion, pattern, availability, and recent-wear rules. Explain suggestions, for example, “These neutral pants match your blue shirt.” Support choosing a shirt, pants, or shoes as the starting item. Never suggest clothing that the user has not added.

Photo upload is feasible. Automatic color sampling can use browser image pixels, but lighting and backgrounds affect results; let users correct the detected color. Reliable automatic clothing recognition or background removal would require additional computer-vision capability and is optional future scope.

Personalization for Indian users should support varied skin tones and optional, user-selected undertone and color preferences. Nationality does not determine skin tone or a universally correct palette. Suggestions should be editable preferences, not claims that particular colors are objectively unsuitable.

## Planned implementation

1. Replace sample-only wardrobe data with photo-backed, editable personal items and durable local storage suitable for images.
2. Record wear events by stable item identifiers, timestamp, and occasion. Keep history when names change or items are archived.
3. Add individual last-worn labels, occasion history, and independent laundry controls.
4. Generate and explain matching combinations from available wardrobe items. Show a helpful empty state when no complete combination exists.
5. Replace placeholder counts and controls with real behavior; provide data export and restore.
6. After Java is confirmed, add Spring, JDBC, and SQL persistence for accounts, wardrobe metadata, wear events, and laundry state. Store photo files separately with references in the database.

## Proposed SQL records

- Users: identity and optional style preferences.
- Wardrobe items: owner, category, name, photo reference, color, pattern, occasions, availability, and archive state.
- Wear events: owner, timestamp, and occasion.
- Wear event items: links between each event and its wardrobe items.
- Laundry events: item, time marked unavailable, and time returned.

## Folder structure

- README.md — project idea, feasibility, current state, and implementation scope.
- src/ — existing React JS application and CSS.
- index.html — application entry page.
- package.json and package-lock.json — existing dependencies and run commands.
- vite.config.js — existing development configuration.
- docs/original-README.md — original setup notes, preserved unchanged.
- docs/Smart_Wardrobe_Project_Report.docx — existing project report, preserved unchanged; its contents have not been evaluated for this assessment.
- docs/archive/ — preserved incidental files.
- node_modules/ — installed dependencies; keep in place for the application to run.

## Run the current prototype

Install the dependencies with `npm install`, then start it with `npm run dev`. Create a production build with `npm run build` and inspect it with `npm run preview`.

The existing development tooling supports the React JS app; it does not add another application language to the requested stack.

## Completion checks

- Uploaded personal items remain available after refresh.
- Selecting any category produces compatible suggestions only from owned, available items.
- Recording a college outfit and a party outfit on the same day preserves both events.
- Every item shows its correct last-worn date and occasion, including after laundry.
- Missing categories, all-items-in-laundry states, and storage failures produce clear feedback.
- All displayed counts reflect stored data, and primary controls work on mobile and with a keyboard.

## Technical references

- [Spring file uploads](https://spring.io/guides/gs/uploading-files/)
- [Spring SQL and JDBC support](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Browser image pixel access](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
