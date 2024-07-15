import { BOT_BRANCH_PATTERNS, DEFAULT_BRANCH_PATTERNS, HIDDEN_MARKER_END, HIDDEN_MARKER_START, JIRA_REGEX_MATCHER } from './constants';
import { JIRA, JIRADetails } from './types';

const getJIRAIssueKey = (input: string, regexp: RegExp = JIRA_REGEX_MATCHER): string | null => {
  const matches = regexp.exec(input);
  return matches ? matches[matches.length - 1] : null;
};

export const getJIRAIssueKeyByDefaultRegexp = (input: string): string | null => {
  const key = getJIRAIssueKey(input, new RegExp(JIRA_REGEX_MATCHER));
  return key ? key.toUpperCase() : null;
};

export const getJIRAIssueKeysByCustomRegexp = (input: string, numberRegexp: string, projectKey?: string): string | null => {
  const customRegexp = new RegExp(numberRegexp, 'gi');

  const ticketNumber = getJIRAIssueKey(input, customRegexp);
  if (!ticketNumber) {
    return null;
  }
  const key = projectKey ? `${projectKey}-${ticketNumber}` : ticketNumber;
  return key.toUpperCase();
};

export const shouldSkipBranch = (branch: string, additionalIgnorePattern?: string): boolean => {
  if (BOT_BRANCH_PATTERNS.some((pattern) => pattern.test(branch))) {
    console.log(`You look like a bot 🤖 so we're letting you off the hook!`);
    return true;
  }

  if (DEFAULT_BRANCH_PATTERNS.some((pattern) => pattern.test(branch))) {
    console.log(`Ignoring check for default branch ${branch}`);
    return true;
  }

  const ignorePattern = new RegExp(additionalIgnorePattern || '');
  if (!!additionalIgnorePattern && ignorePattern.test(branch)) {
    console.log(`branch '${branch}' ignored as it matches the ignore pattern '${additionalIgnorePattern}' provided in skip-branches`);
    return true;
  }

  return false;
};

const escapeRegexp = (str: string): string => {
  return str.replace(/[\\^$.|?*+(<>)[{]/g, '\\$&');
};

export const getPRDescription = (oldBody: string, details: string): string => {
  const hiddenStartMarkerRegex = escapeRegexp(HIDDEN_MARKER_START);
  const hiddenEndMarkerRegex = escapeRegexp(HIDDEN_MARKER_END);

  const replaceDetailsRegex = new RegExp(`${hiddenStartMarkerRegex}([\\s\\S]+)${hiddenEndMarkerRegex}[\\s]?`, 'igm');
  const jiraDetailsMessage = `
    ${HIDDEN_MARKER_START}
    ${details}
    ${HIDDEN_MARKER_END}
  `;

  if (replaceDetailsRegex.test(oldBody)) {
    return (oldBody ?? '').replace(replaceDetailsRegex, jiraDetailsMessage);
  }
  return jiraDetailsMessage + oldBody;
};

export const buildPRDescription = (issues: JIRADetails[]) => {
  return issues
    .map((issue) => {
      return `- [ ] [${issue.key}](${issue.url}) ${issue.summary}`;
    })
    .join('\n');
};

export const toJiraIssueView = (issue: JIRA.Issue, jiraBaseUrl: string) => {
  const {
    fields: { issuetype: type, summary },
  } = issue;

  return {
    key: issue.key,
    summary,
    url: `${jiraBaseUrl}/browse/${issue.key}`,
    type: {
      name: type.name,
      icon: type.iconUrl,
    },
  };
};
