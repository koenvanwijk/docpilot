# DocPilot inside GitHub: native Markdown review

DocPilot can be used as a **GitHub Copilot custom documentation agent**, without the separate DocPilot Pages frontend or Node.js backend.

## What is installed?

The repository contains [`.github/agents/docpilot-review.agent.md`](../.github/agents/docpilot-review.agent.md), a GitHub Copilot cloud-agent profile. It also lives in [European Physical AI Operations](https://github.com/koenvanwijk/european-physical-ai-operations-reference-architecture/blob/main/.github/agents/docpilot-review.agent.md), where it can work with architecture Markdown documents.

A repository file **cannot inject a custom text-selection overlay into GitHub.com**. This profile customizes the AI agent, not the GitHub UI.

## Native GitHub workflow

1. Work in a **non-default branch** and create a pull request containing the Markdown file(s) you want to review. A PR can only show line-specific review comments in its changed files.
2. Open **Files changed**, choose the **rich diff / rendered view** for Markdown, and attach comments to the relevant file/lines. For example: "Verkort dit", "Verdiep met trade-offs", "Gebruik een concreet ISA-95 voorbeeld".
3. Click **Start a review** for each comment, then **Submit review** when you've collected all feedback.
4. With a paid Copilot plan and Copilot cloud agent enabled, select the review comments you want to delegate using **Add to batch**, then choose **Fix and commit**. GitHub Copilot applies them on the PR branch. You can also mention `@copilot` in a PR discussion to ask it to address feedback. This is **GitHub Copilot functionality**, not an action implemented by the DocPilot agent profile.
5. Review the resulting diff, iterate or merge the PR when satisfied.

Official docs: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github and https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files

## Use the custom DocPilot agent

1. Open https://github.com/copilot/agents (requires access to Copilot cloud agent).
2. Select the repository you want to edit (e.g. `koenvanwijk/european-physical-ai-operations-reference-architecture`).
3. Select **DocPilot Markdown Reviewer** in the agent selector.
4. Ask the agent to improve a specific Markdown file in a PR or review the outstanding comments; give the PR number and request tightly scoped edits. Do not merge until you've inspected the diff.

**Important:** Choosing the DocPilot custom agent from the Agents tab is distinct from GitHub's built-in **Add to batch → Fix and commit** flow. Do not assume GitHub always uses the custom agent profile for a batch started in the PR UI.

## Exact selection on rendered Markdown

GitHub's native Markdown rich diff is not a general-purpose editor with a word-selection-to-agent prompt box. To anchor a **text-range selection** to native PR comments in the rendered view, you can use a browser extension such as [GitHub MD Review](https://chromewebstore.google.com/detail/github-md-review/hcoodlcadbhcgikicjkijhdnglcjjebj) (independent third-party extension; review its permissions, particularly for private repositories). It adds a GitHub-styled review surface, and selected-text comments are posted as native PR review comments.

For a fully bespoke overlay inside the GitHub website, we would need to develop a browser extension; creating a GitHub App or storing files in a repository cannot directly change the github.com document viewer.

## Model and access

The installed custom agent works through GitHub Copilot cloud agent and therefore requires a supported paid Copilot subscription and repository access. It does **not** automatically connect to your local DGX Spark/DeepSeek endpoint. Using DeepSeek would require a separate GitHub Action/GitHub App workflow with a securely hosted model endpoint, and the ability to reach that endpoint from the workflow.

Changes should remain on a PR branch, with the owner reviewing and merging to `main`.
