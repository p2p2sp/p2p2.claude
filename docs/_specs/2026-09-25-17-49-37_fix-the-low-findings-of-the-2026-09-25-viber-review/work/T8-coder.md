# T8 - Coder notes

Updated the `cwd` line in create-issue.sh header from "irrelevant to this script; gh resolves the repository itself" to "gh resolves the repository from the cwd."

This clarifies that cwd is NOT irrelevant and explicitly states that gh resolves the repository from the working directory, matching the documentation pattern used in issue-facts.sh for cwd dependencies.

The gh issue create call on line 75 carries no --repo flag, confirming gh uses the cwd's repository.
