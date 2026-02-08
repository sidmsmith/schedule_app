# Appointment Calendar

Version: v0.1.1

Status: Production (moved out of Development on Apps Homepage)

## Overview
Appointment Calendar is a responsive web and mobile scheduling UI that displays a 5-day grid of hourly availability, supports week navigation, search, and appointment scheduling with optional ICS downloads.

## Notable in v0.1.1
- Mobile next/prev buttons advance exactly one week regardless of preloaded weeks or scroll.
- Confirmation modal closes only via Close button; backdrop clicks are ignored.
- Scheduled slots get the same flashing halo highlight as search results.
- Mobile collapsed search width increased for usability.

## Deployments
- Platform: Vercel
- Production URL: https://scheduleappt.vercel.app
- Branch: main (auto-deploys on push)

## Environment Variables (Vercel)
- MANHATTAN_PASSWORD
- MANHATTAN_SECRET
- ORG (e.g., SS-DEMO)

## Development
- Local mock mode available via `?mock=1` flag to view populated calendar without live auth.

## License
Proprietary – internal use.



## Overview of User Interactions
The Appointment Calendar app (v0.1.1) provides a responsive interface for viewing, navigating, searching, and scheduling appointments in a 5-day (Monday-Friday) grid format. Interactions are primarily handled through buttons, inputs, modals, and clickable elements in the calendar. Below, I'll summarize all key user interactions (excluding ORG authentication as requested), grouped by category for clarity. These are based on the app's frontend (HTML/CSS) and backend API logic, with a focus on the specified areas: clicking a cell, entering a PO, the modal checkbox (ICS toggle), and search functionality. The app emphasizes mobile-friendly design, such as adjusted button behaviors and search widths.
Calendar Navigation and Viewing

Previous/Next Week Buttons: Clicking "Previous Week" or "Next Week" loads the adjacent week's calendar data. On mobile, these buttons always advance exactly one week forward or backward, regardless of the current scroll position or preloaded weeks, ensuring consistent navigation.
Day Navigation Buttons: A set of buttons (e.g., for Monday through Friday) appears in the toolbar. Clicking one jumps directly to that day's column in the grid, highlighting it as active. This acts like tabs for quick day-specific focus.
Scrolling Through the Grid: Users can scroll vertically through the hourly slots in the calendar grid. The grid preloads multiple weeks for seamless scrolling, with visual dividers labeling each week (e.g., "Week of [Date]").
Back to Top Button: A floating arrow button appears when scrolled down. Clicking it smoothly scrolls the view back to the top of the calendar grid.
Theme Selector Button: A gear icon in the top-right corner opens a modal with theme options (e.g., light/dark). Selecting a theme applies CSS variable changes instantly, updating colors, backgrounds, and borders for the entire app.

Interacting with Calendar Slots (Cells)

Clicking a Slot/Cell: When you click on an available hourly slot in the 5-day grid, it triggers the scheduling process:
The slot is visually highlighted (e.g., with a flashing "halo" effect for emphasis).
A "Schedule Appointment" modal opens, pre-populated with the selected slot's date and time (fetched from the backend via the calendar-data API).
In the modal, you can enter details (see below). If the slot is already scheduled or occupied, it may show details instead or prevent scheduling based on occupancy (color-coded: green for low, yellow for medium, red for high).

Viewing Slot Details: Hovering or clicking certain slots may display a "Slot Info Toast" popup with metadata, such as exact time, occupancy percentage, and a list of existing appointments. You can close this toast via the "×" button.

Scheduling an Appointment (Modal Interactions)

Entering a PO (Purchase Order): In the "Schedule Appointment" modal (opened by clicking a slot), there's a required input field for the Purchase Order (e.g., "PO12345"). Entering a valid PO associates it with the appointment. This data is sent to the backend via the schedule-appointment API, which includes details like appointment type ("DROP_UNLOAD"), equipment ("48FT"), preferred date/time, and duration (60 minutes). If left blank, an error message appears in the modal, preventing confirmation.
Entering Driver Name: An optional input field for the driver's name (e.g., "John Doe"). This adds contextual info to the appointment but isn't required for submission.
Confirm/Cancel Buttons: Clicking "Confirm" submits the form to the backend API, scheduling the appointment if valid (e.g., available slot). On success, the modal closes, the slot updates in the grid (with a flashing halo highlight), and a confirmation modal appears. Clicking "Cancel" closes the modal without changes.
Modal Behavior: The modal only closes via the "Cancel" or "Close" buttons—clicking outside (on the backdrop) is ignored to prevent accidental dismissal.

Confirmation Modal and ICS Checkbox

ICS Toggle Checkbox: After successful scheduling, a confirmation modal shows a success message (e.g., "Appointment Scheduled"). It includes a toggle button (styled as a calendar icon with a check/ban indicator) for "Auto-download calendar."
Checking/enabling this (by clicking the toggle) automatically downloads an ICS file for the appointment, allowing easy import into calendars like Google Calendar or Outlook.
Unchecking/disabling it prevents the download. The toggle starts off (aria-pressed="false") and can be flipped on/off before closing the modal.

Close Button: Clicking "Close" dismisses the confirmation modal. Like the scheduling modal, backdrop clicks are ignored.

Appointment Search

How Search Works: In the "Appointment Search" section, enter one or more appointment IDs (e.g., "APT00123 APT00124") into the input field, separated by spaces, commas, or semicolons. Clicking the "Search" button (or pressing Enter) processes the query:
The app scans the loaded calendar data (from the calendar-data API) for matches.
Matching slots are highlighted in the grid with a flashing halo effect, similar to newly scheduled ones.
If no matches are found, an error message ("No Appointment Found") appears below the input.
On mobile, the search input is widened for easier typing. This is a client-side feature for quick locating without reloading the full grid.


Other Miscellaneous Interactions

Legend Reference: The color-coded legend (green/yellow/red dots) is always visible in the toolbar but isn't interactive—it's for reference only.
Error and Status Feedback: Various elements show dynamic feedback, like status messages in the workspace or errors in modals/search, but these are passive (no direct user action beyond triggering them).
Workspace Unlocking: After loading (post-auth), the calendar workspace visually "unlocks" with a glowing border and shadow, indicating it's ready for interactions.

These interactions make the app intuitive for warehouse/logistics users, focusing on quick scheduling and visibility. If you provide script.js (the JavaScript file handling event listeners), I could detail exact code flows or edge cases.
