# UI and workflow audit, revision 2

Audit date: 22 September 2026. Scope: the running Kavu application at `http://127.0.0.1:5173`, using isolated Playwright browser contexts and sample identities. The original local findings remain below. The final hosted verification appears in the release addendum.

## Result

The revised interface completes the tested intake, planning, yard-work, measurement, readiness, evidence-export and account journeys. It also preserves useful state when requests fail, explicitly separates replay from real outdoor operations, and works without document-level horizontal overflow at **390, 768 and 1440 pixels**.

The final local browser run passed **16 of 16 end-to-end tests**, including the five existing product journeys and eleven audit regressions. Automated accessibility checks cover all five application pages at all three widths, plus plan review, intake, batch detail, meter reading and reset dialogs. Registration and the expanded demonstration guide were checked separately. The account flow also verifies opening and closing account settings from the mobile drawer. No serious or critical axe violations remain in these tested states. This is an automated and keyboard audit, not an accessibility certification or a substitute for testing with assistive-technology users.

## Findings and changes

| Finding | Change | Verification |
| --- | --- | --- |
| The batch register expanded the whole document on phones and tablets. The overview's horizontal table was not keyboard-scrollable. | Contained positioned table regions; explicit keyboard focus and accessible region names; narrow-screen scroll hints. | Five pages at three widths, zero document overflow; axe checks; CSV workflow. |
| Closed mobile navigation retained keyboard-accessible controls. The open drawer did not contain focus or support Escape. | Closed navigation is inert; open navigation traps Tab, blocks background interaction, supports Escape and returns focus to its trigger. The sidebar can scroll on short screens. | Phone keyboard regression. |
| Modal focus restoration and hidden background controls needed stronger isolation. | Dialogs preserve the initiating control, make the surrounding interface inert, trap focus, restore background interaction and return focus on close. | Keyboard regression plus five modal accessibility scans. |
| Existing plan, batch and reading dialog text had insufficient contrast. | Darkened summary labels, batch names, recommendation explanations and recorded-moisture values within the established palette. | Zero serious/critical modal axe findings. |
| Phone forms used small input text and several operational instructions were difficult to read. The narrow priority card split a long instruction into two cramped columns. | Larger phone input text and touch controls, readable instructions, a single-column phone priority card, stacked tablet page headings, and viewport-aware dialogs. | Phone/tablet screenshots and responsive checks. |
| A real account's new intake inherited the selected historical replay date as its deadline. | Real intake defaults to the current East Africa calendar day. Demonstration intake continues to follow the selected sample day. | Real-account intake test checks both value and minimum date. |
| Real users could attempt historical outdoor jobs and only then encounter the server's rejection. | Explicit replay boundary and a live-weather action; historical outdoor jobs display “Replay only” and remain disabled in real workspaces. The server remains authoritative. | Real account, batch intake, plan creation and disabled outdoor-job controls. |
| Live weather could only be refreshed by switching modes. Refresh could overwrite the selected replay day. Long-open screens did not reevaluate freshness. | A refresh action preserves the last replay day; planning reevaluates the actual clock every minute; session changes invalidate pending loads and forecasts. | Failed forecast, successful refresh, return to prior replay day, and simulated seven-hour weather expiry. |
| Password-change confirmation disappeared on the login screen. Expired sessions left an unusable workspace. | Sign-in displays session and password-change feedback; unauthorized writes return to an explained login screen. | Password-change/sign-in journey and forced session-expiry test. |
| Revision conflicts re-mounted the settings form and discarded entered values. | Latest records load after a conflict while the operator's draft remains in the form. The user reviews and explicitly retries. | Controlled 409 response, retained draft, successful retry. |
| A failed plan request relied only on a short-lived toast. | The review dialog keeps a persistent error and remains available for a deliberate retry. Intake errors also retain entered values. | Controlled server and connection failures followed by successful retries. |
| Reset was available only in the browser-only build, leaving hosted sample workspaces harder to recover. | Server demonstrations now expose the same confirmed reset action. Real workspaces never expose it. | Cancel preserves an illustrative reading; confirmed reset restores original records. |
| First-time users and judges had to infer the intended sequence. | An optional three-step demonstration guide compares dry, humid and missing-data days. Empty real workspaces lead to yard setup and first measured intake. | Guide transitions, real onboarding and intake checks. |
| Weather-hour explanations were accessible only through a desktop hover title. | Tappable and keyboard-operable hourly controls expose the conditions and reasons behind the classification. | Phone interaction verifies humidity and rain evidence. |
| Empty filtered results had no direct reset, and export scope was unclear. | Clear filters action, disabled export when no rows match, explicit CSV naming, and a correct EAT calendar-date header. | Actual downloaded CSV verifies filtering, quote escaping and formula neutralization. |
| Job counters mixed historical plans, and completed plans prompted users to create jobs again. | Counters follow the selected mode/date; completed-plan empty states explain how to review completed work. | Selected-plan handover regression and source review. |

The welcome screen now states the intended user and decision directly: maize cooperatives deciding what to dry, cover or send to a dryer. Source limitations remain available behind a clearly labelled expandable section, with current-mode and demonstration labels always visible. No field-impact claims were added. Visible UI em dashes were removed from frontend copy; shared task prefixes are handled by the repository-wide copy pass.

## Reproduction

Run the normal local server, then:

```sh
E2E_BASE_URL=http://127.0.0.1:5173 npx playwright test
npx tsc --noEmit
```

Repeated exploratory runs correctly triggered the normal sign-in rate limiter on the shared development instance. The clean final suite ran on an isolated instance at port 5175 with a fresh SQLite database and the ordinary rate limits still enabled; the deployment configuration was not relaxed.

The audit tests are in `tests/e2e/ui-audit.spec.ts`; the original complete workflow checks remain in `tests/e2e/app.spec.ts`. Edited TypeScript files also pass ESLint. Playwright preserves failure screenshots and traces. Manual before/after screenshots were captured under `output/screenshots/audit-*`; these are local review artifacts.

Failure tests deliberately stub individual responses to exercise recovery, and the weather-expiry test uses an explicitly synthetic forecast fixture and an advanced browser clock. They are UI behavior checks, not weather-performance evidence. The account, persistence, batch, command, reset and CSV journeys use the actual local backend.

## Remaining boundaries

- This pass does not claim cross-browser, physical-device or screen-reader certification. Chromium was tested at the specified viewport widths.
- The hosted backend now has a separate 17-test pass, including Firestore-backed account persistence. This extends the local evidence without claiming customer-scale reliability.
- Account password changes are available after sign-in. Email verification and self-service forgotten-password recovery are not implemented; the UI does not imply otherwise.
- Live weather comes from a model. The Conduit archive remains historical, drying thresholds remain interpretable heuristics, and meter readings remain the basis for moisture and storage-readiness decisions.
- The software does not book a dryer, dispatch grain automatically, prove food safety or establish causal financial savings. Those operating boundaries remain explicit in the actual flows.

## Hosted release addendum

The implementation owner ran the suite against **https://kavu-drying.web.app/** after deploying version **2.0.0**, Cloud Run revision `kavu-api-00002-sfv`. **All 17 hosted browser tests passed** in approximately 1.6 minutes. The extra regression holds the loading state open and checks its accessibility after a contrast correction. The original **16/16 local result** above remains scoped to the earlier local run.

Hosted coverage includes signup, sign-out, sign-in, password change and record persistence, the operator job and moisture workflow, CSV, errors/retries, revision conflicts, forecast freshness, all five pages at 390/768/1440 pixels, and the operation dialogs. No serious or critical axe violations occurred in the tested states. Controlled failures and synthetic forecast fixtures retain the same interpretation described above.

The production dependency audit reported zero known vulnerabilities. This is a dependency check, not a penetration test or a claim of complete accessibility conformance.
