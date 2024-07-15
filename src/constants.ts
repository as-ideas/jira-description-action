export const HIDDEN_MARKER_END = '<!--jira-description-action-hidden-marker-end-->';
export const HIDDEN_MARKER_START = '<!--jira-description-action-hidden-marker-start-->';

export const BOT_BRANCH_PATTERNS: RegExp[] = [/^dependabot/];

export const DEFAULT_BRANCH_PATTERNS: RegExp[] = [/^master$/, /^production$/, /^gh-pages$/];

export const JIRA_REGEX_MATCHER = /([a-zA-Z0-9]{1,10}-\d+)/g;
