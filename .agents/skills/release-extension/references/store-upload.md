# Chrome Web Store and Microsoft Edge Add-ons updates

Use this workflow when the user asks to upload or submit an extension update to either store. GitHub Release publication and store submission are separate outcomes. An upload alone is a draft, not a submitted update or a live store release.

## Shared preparation

- Use the exact ZIP verified for the release; record its version, size and SHA-256. When uploading after a GitHub Release, verify the release asset has the same digest. Do not repackage or edit the ZIP between destinations.
- For a stable release, remove prerelease `version_name` such as `1.9.6-alpha.1`; do not merely rename the ZIP. Chrome manifest `version` stays numeric. Preserve existing permissions, host access and injection matches unless the requested change requires otherwise; compare against the last stable tag.
- Select the existing extension by its store ID, not just its display name. Read the current draft/review/live versions before modifying it. Do not create a new listing for an update or overwrite unrelated pending drafts/submissions.
- Use the user's already authenticated browser. If login, MFA or CAPTCHA needs the user, keep the correct tab open and give a focused handoff; do not ask for passwords or copy tokens/cookies. Continue independent authorized work while waiting. Do not change account or publisher settings.
- Use the browser upload/file-chooser capability. If that capability cannot access the local release ZIP, use the standard native file picker where permitted: select the upload control, wait for the picker, use macOS Cmd+Shift+G, enter the absolute ZIP path, confirm navigation, verify the selected filename/version, then Open. Observe picker state between steps; pasting before the picker appears can lose the path. Do not alter extension security permissions just to make an upload work.
- Some browser connectors cannot script the Chrome extensions gallery/developer console. Use permitted native accessibility controls for that page rather than injected scripts. If the user changes tabs or takes over during an upload/submission, re-read the actual current state before acting; a submission may already be complete.

## Chrome Web Store

1. Open <https://chrome.google.com/webstore/devconsole/> and wait for any existing sign-in session to restore. Select the existing publisher and extension.
2. Open **Package / 文件包**, then **Upload new package / 上传新的软件包**. In the upload dialog use **Choose file / 选择文件** and select the verified ZIP.
3. Wait for upload and validation to finish. Confirm the **Draft / 草稿** version equals the target numeric release and read any blocking errors.
4. Open the status/review flow and choose **Submit for review / 提请审核** when submission is authorized. Review the actual dialog, publication timing, and any requested declarations. Preserve existing listing, privacy and distribution settings; do not invent changes to satisfy validation. If new legal terms or a materially broader declaration require user action, hand off that specific step.
5. Verify a final **Pending review / 审核中** or equivalent status tied to the target version. An older live version can remain displayed beside the new pending version. Record the dashboard URL and screenshot. Report “submitted for review” unless the dashboard/public listing actually confirms the new version is live.

## Microsoft Edge Add-ons

1. Open <https://partner.microsoft.com/dashboard/microsoftedge/overview>. If redirected to Partner Center Home, select the existing **Edge** workspace rather than guessing other routes.
2. Open the existing extension and check its live version. Choose **Update**, then **Packages**, and **Replace** for the existing ZIP.
3. Select the verified ZIP. Wait for validation; verify the package name, target version and **Complete** status. Read blocking validation messages before continuing.
4. Continue through the existing submission sections without changing unrelated availability, properties, privacy or listings. Enter accurate reviewer/release notes only if required, based on the actual change. Use the overview submission control when authorized and verify the confirmation dialog before submitting.
   - The final **Submit your extension** page requires **Notes for certification** on every submission. Preserve existing tester credential choices; never invent credentials or claim premium features work without them. Do not echo or store existing test credentials in screenshots, release notes, skill files or console logs. If required credentials are absent, request the user's input for that specific field.
5. Record the resulting target-version review/certification status and screenshot. A package showing **Complete** means upload validation, not certification or store publication.

## DeepShare identifiers

- Chrome public extension ID: `omnaecaamcabmnbjnpjpecoaalfgidop`.
- Edge public extension/CRX ID: `pdccjnppfegekpnhfljbngammgfbcofm`.
- Edge Partner Center product ID: `a0b1a05c-173a-4d7a-b538-f4e17b5fbc08`.
- Resolve publisher-specific Chrome dashboard links from the authenticated console. Do not confuse the locally loaded unpacked-extension ID with either store ID.

## Recovery and reporting

If upload or submission fails, inspect the current draft/status before retrying so the same version is not submitted twice. Preserve completed GitHub publication and the other store's successful submission. Report each destination separately: package uploaded, submitted for review, live, or blocked with a concrete reason. Do not wait for multi-day certification or schedule polling unless the user requests it.
