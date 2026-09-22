# Supplementary server account recording

**File:** [`output/kavu-accounts-silent.mp4`](../../output/kavu-accounts-silent.mp4)

This separate 60-second silent clip demonstrates the real local server at `http://127.0.0.1:5173`, including its account API and SQLite persistence. A permanent on-screen disclosure distinguishes this recording from the public browser-only demonstration. The application UI is the actual running product throughout; only the disclosure strip is an editing overlay.

| Time | Actual interaction |
| --- | --- |
| 00:02–00:10 | Create a new account for “Sample operator” using a generated `example.test` email and masked random password. |
| 00:10–00:19 | Show the new account’s empty private workspace. |
| 00:19–00:37 | Add “Server proof lot,” a sample 250 kg batch with a 17.5% illustrative intake reading. |
| 00:37–00:45 | Sign out, then sign back in using the same sample account. |
| 00:45–01:00 | Show the persisted batch and inspect its original weight and reading. |

The recorder verifies an initially empty workspace, then checks the server response after signing back in for the same batch name, 250 kg weight, and 17.5% moisture. The capture completed with **zero browser JavaScript errors**. It also checks that password inputs remain masked and revokes the recording session afterward. The generated password is never logged or saved by the recorder. No real customer or personal data is used.

Verified output: **60.000 seconds**, **1440 × 900**, **24 fps**, **H.264**, **1,052,999 bytes**, and **no audio stream**. A decoded final video frame was inspected to confirm the persisted batch and local-server disclosure are readable. Verification reports and intermediate screenshots are generated under the ignored `output/build/video/accounts/` directory.

To reproduce, run the normal local server as described in the README, then execute `node scripts/record-accounts.mjs`. Playwright Chromium, `ffmpeg`, and `ffprobe` must be available. The recorder creates a new sample account each time; it does not use the browser-only demo mode.

This is supplementary technical evidence, separate from the main 4:25 submission video. Concatenating both unedited would exceed the hackathon’s five-minute limit. Share it as an additional evidence link, or replace a short segment of the main video if the final edit needs to show accounts. It contains no narration or teammate appearance and does not demonstrate a publicly hosted full-stack service.
