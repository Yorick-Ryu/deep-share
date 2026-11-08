---
name: release-extension
description: Package and release browser extensions, including version bumps, git tags, GitHub Releases, and authorized Chrome Web Store or Microsoft Edge Add-ons updates. Use for packaging, release publishing, or uploading an extension update to these stores.
---

# Release Extension

## Overview

Use this skill to run a conservative end-to-end release flow for a repo that packages an extension or lightweight app and publishes GitHub Releases. Treat the release as a live operation: inspect first, preserve user changes, verify artifacts, and only push or publish after the local release state is correct.

Follow the user's requested scope: packaging alone does not authorize commits, pushes, GitHub publication or store submission. For Chrome/Edge upload or review submission, read [the store update workflow](references/store-upload.md). Reuse the exact verified release ZIP across destinations and report their statuses separately.

## Workflow

1. Inspect repository state:
   - Run `git status --short --branch`, `git remote -v`, `git tag --sort=-version:refname`, and recent `git log --oneline --decorate -n 8`.
   - Check for uncommitted changes. Do not overwrite or stage unrelated user edits. If unrelated dirty files exist, ask before proceeding unless the release can clearly avoid them.
   - Identify whether the branch is ahead/behind the remote. If behind or diverged, stop and explain the risk before pushing.

2. Find version and packaging sources:
   - Prefer established project files: `manifest.json` for browser extensions, then `package.json`, `pyproject.toml`, `Cargo.toml`, Gradle files, or existing release scripts.
   - Read the packaging script before running it, such as `package.sh`, `npm run build`, `npm run package`, or equivalent.
   - Confirm whether generated archives are tracked. Use `git ls-files '*.zip' '*.tar.gz' '*.crx' '*.xpi'` before deciding whether to commit artifacts.

3. Choose the next version:
   - Use the user's requested version if provided.
   - Otherwise bump the patch version from the current manifest/package version when the release is a small fix.
   - Match the existing tag format, usually `vX.Y.Z`.
   - Check that the target tag and release do not already exist locally or remotely before creating them.

4. Update version files:
   - Edit only the authoritative version file(s).
   - Preserve formatting where practical. Avoid unrelated normalization unless the file already changes that way.
   - Show or inspect the diff before committing.

5. Package and verify:
   - Run the repo's packaging command.
   - Verify the expected asset exists and has a plausible size.
   - For zip-based browser extension releases, inspect the packaged manifest with `unzip -p <asset>.zip manifest.json` and confirm the version matches.
   - If the package unexpectedly includes noisy files such as `.DS_Store`, note it and fix only when it is clearly required for the requested release.

6. Commit and tag:
   - Stage only intended version files, not generated release assets unless the repo already tracks them.
   - Use a message like `chore: bump version to X.Y.Z`.
   - Create an annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
   - If tag creation fails because of sandbox permissions, retry with escalation rather than using a workaround.

7. Push:
   - Push the branch and tag together when possible: `git push origin <branch> --follow-tags`.
   - If pushing fails due to authentication, network, or branch protection, report the exact blocker and leave the local commit/tag intact.

8. Publish GitHub Release:
   - Prefer GitHub CLI when available: `gh release create vX.Y.Z <asset> --title "Project X.Y.Z" --notes "<concise notes>"`.
   - If release notes are not supplied by the user, derive concise notes from commits since the previous tag.
   - Mark prerelease/draft only when the user asks or the repo's release pattern clearly uses it.
   - After publishing, run `gh release view vX.Y.Z --json tagName,name,url,assets,isDraft,isPrerelease` when possible and report the URL and uploaded asset.

9. Final checks:
   - Run `git status --short --branch`.
   - Report the version, tag, commit hash, package path, release URL, and any remaining untracked artifact.
   - If store updates were requested, upload/submit using the linked workflow and verify each store's final version and status. Distinguish review submission from a version already live in the store.

## Guardrails

- Never run destructive git commands such as `git reset --hard`, `git checkout --`, or delete user files unless the user explicitly requested that action.
- Do not create or overwrite a release tag if the target version already exists. Inspect first and ask how to proceed.
- Keep release assets out of git unless the project already tracks them or the user asks to commit them.
- Use approvals/escalation for live pushes, GitHub release creation, network operations, and writes outside the workspace when required by the environment.
- If any live step partially succeeds, continue from the actual state instead of restarting. Example: if the tag was pushed but release creation failed, do not recreate the tag; publish the release from the existing tag.

## Useful Commands

```bash
git status --short --branch
git tag --sort=-version:refname
git log --oneline --decorate -n 8
git ls-files '*.zip' '*.tar.gz' '*.crx' '*.xpi'
git diff -- <version-file>
git add <version-file>
git commit -m "chore: bump version to X.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin <branch> --follow-tags
gh release create vX.Y.Z <asset> --title "Project X.Y.Z" --notes "<notes>"
gh release view vX.Y.Z --json tagName,name,url,assets,isDraft,isPrerelease
```
