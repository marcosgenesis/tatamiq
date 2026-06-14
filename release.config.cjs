module.exports = {
  branches: ["main"],
  tagFormat: "v\x24{version}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md"],
        message: "chore(release): \x24{nextRelease.version} [skip ci]\n\n\x24{nextRelease.notes}",
      },
    ],
  ],
};
