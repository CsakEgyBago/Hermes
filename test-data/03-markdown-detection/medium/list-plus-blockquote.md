> Remember to double check these before shipping:

- Verify the build number
- Confirm the release notes
- Tag the release in the repository
- Notify the support team the rollout is going out

None of these steps should be skipped even for a small patch release, since the last incident traced back to exactly this checklist being shortcut under time pressure.

The checklist grew out of a postmortem from a release that went out with the wrong build number attached, which caused a fair amount of confusion when a customer reported a bug that had already been fixed two versions earlier. Since then, whoever is running the release reads through this list out loud on the release call before tagging anything, even if it feels redundant on a quiet week. Support has said the advance notice makes a real difference in how prepared they feel for any questions that come in right after a rollout goes live.
