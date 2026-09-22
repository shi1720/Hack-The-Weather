# Kavu testing instructions

**Hosted app:** [kavu-drying.web.app](https://kavu-drying.web.app/). Signup, sign-out, sign-in and password-change persistence have passed against the live Firestore-backed service.

**Repository:** [shi1720/Hack-The-Weather](https://github.com/shi1720/Hack-The-Weather)

Use fictional batch and grower details while evaluating. Each demonstration workspace starts with sample lots and real historical weather observations. Plan and measurement results below assume the original demonstration seed, its 3,000 kg capacity and its KSh 377.80 tariff setting.

## Quick judge walkthrough: about five minutes

1. Open the hosted app and choose **Explore demo workspace**. The historical replay banner identifies the evidence mode.
2. On **Overview**, select **8 September 2026**. Expect **Data unavailable** and no suitable outdoor drying hours. Missing rainfall is reported as unavailable.
3. Select **15 September 2026**. Expect usable observations but zero suitable drying hours under humid conditions.
4. Select **12 September 2026**. Expect six suitable historical hours and an allocation of **2.7 / 3 tonnes**. This is retrospective replay, so every judge can reproduce the same conditions.
5. Open **Mavuno A-01** and check **1,800 kg** and **18.2%**. Close its details. Choose **Build operator plan**, review the reasons and capacity, then **Create operator jobs**.
6. In **Drying yard**, locate Mavuno's spread job and choose **Complete**. Complete its turn job as well. The lot and task state should update. **Copy brief** produces pending work for the selected date and mode.
7. Open **Batches**, then **Mavuno A-01**, then **Log reading**. Enter **15.0** and a note such as `Demonstration meter reading`. Save.
8. Open **Impact ledger**. Expect approximately **KSh 2,176** of tariff-equivalent reduction. The exact example is `1.8 x (18.2 - 15.0) x 377.80 = 2,176.128`. This compares reference drying charges; it does not establish actual savings.
9. Return to Mavuno and log a separate **12.7** reading with another example note. Open the lot again and choose **Confirm storage readiness**. Expect **ready** status. The more recent reading changes the ledger, so inspect the KSh 2,176 example before this step.
10. Open **Impact ledger** and choose **Export evidence**. Inspect `kavu-impact-ledger.csv`: its header contains generation time in UTC, workspace revision, configured tariff, units and calculation basis. Separate sections retain stable lot IDs, measurements with timestamps and notes, task records and audit history. Open **Data & settings** to inspect the **18,364** unique observations and source provenance.

If the seed was already edited, use **Reset demo** before repeating. Reset affects the current demonstration workspace. Retain any export you want before resetting it.

## Test your own private workspace: about two minutes

1. Sign out of the demonstration. Select **Create an account**.
2. Supply your name, an email address you control and a unique password of at least 12 characters. Choose **Create workspace**. Do not use or publish a shared judge password.
3. Open **Batches** and add a clearly labelled test lot. Example: name `Judge test lot`, grower `Example group`, weight **500 kg**, measured moisture **17.0%**, and a valid deadline on or after the date shown by the form.
4. Reload the page. The lot should remain present.
5. Sign out and sign in with the same credentials. The lot should still be present in your private workspace.
6. In **Account settings**, password change is available if you want to exercise that flow. A successful change revokes existing sessions and requires sign-in again.

The historical demonstration supports simulated spread and turn completion. A real account uses stricter execution rules, so historical replay jobs cannot be treated as current outdoor operating instructions. This distinction is deliberate.

## Optional evidence and resilience checks

- Set demonstration outdoor capacity to **0 kg** in **Data & settings** and rebuild the plan. Outdoor allocation should remain zero. Restore **3,000 kg** afterward.
- Try to confirm storage readiness before entering a recent below-target reading. Expect an explanatory refusal.
- Commit plans for September 12 and September 15. Copy either date's brief. It should contain only that date's pending jobs and identify the replay mode.
- Repeat a **15.0%** measurement. The tariff equivalent should stay unchanged. A later **16.0%** reading should reduce the equivalent because the ledger compares intake with the latest measured moisture gap.
- The separate [GitHub Pages sandbox](https://shi1720.github.io/Hack-The-Weather/) supports offline use after an initial successful load. It stores example data in the browser. The hosted private-account service requires connectivity for server operations.

## Reproduce automated checks

Follow the repository's Node setup, then run:

```sh
npm ci
npm run build
npm test
npm run test:e2e
npm run evaluate
```

Playwright requires its Chromium installation as described in the README. `npm run evaluate` checks the controlled Conduit comparison with fixed operational inputs. The latest default run passed 112 tests and skipped six opt-in Firestore checks. A separate earlier real-Firestore run passed eight checks, including two codec tests also present in the default suite. GitHub CI for core commit `26a9688` passed, including the Firestore emulator, Docker and offline static preview. The final deployed revision `kavu-api-00003-4pb` passed all 17 hosted browser tests, including inspection of the downloaded CSV metadata after the last two fixes.

## Interpreting the result

The workflow shows how weather evidence changes actions and how later meter readings enter the same lot history. Readiness uses a configurable moisture condition and recent recorded measurement. Local sampling, food-quality checks and operating policy still need domain review. The application has no field-validated claim of avoided food loss or customer savings.
