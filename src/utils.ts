import { BOT_BRANCH_PATTERNS, DEFAULT_BRANCH_PATTERNS, HIDDEN_MARKER_END, HIDDEN_MARKER_START, JIRA_REGEX_MATCHER } from './constants';
import { JIRA, JIRAIssueDetails } from './types';

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
  const jiraDetailsMessage = `${HIDDEN_MARKER_START}
  ${details}
  ${HIDDEN_MARKER_END}
  `;

  if (replaceDetailsRegex.test(oldBody)) {
    return (oldBody ?? '').replace(replaceDetailsRegex, jiraDetailsMessage);
  }
  return jiraDetailsMessage + oldBody;
};

export const buildPRDescription = (issues: JIRAIssueDetails[]) => {
  const validIssues = filterIssuesByProject(issues);
  const sortedIssues = sortIssuesByProjectAndId(validIssues);

  return sortedIssues
    .map((issue) => {
      const estimationTextRegexPattern = /[(\[]\d+(?:[,.]\d+)?d[)\]]/g;
      const normalizedSummary = issue.summary.replace(estimationTextRegexPattern, '');

      return `- [ ] [${issue.key}](${issue.url}) ${normalizedSummary}`;
    })
    .join('\n');
};

export const toJiraIssueView = (issue: JIRA.Issue, jiraBaseUrl: string): JIRAIssueDetails => {
  const {
    fields: { issuetype: type, summary, project },
  } = issue;

  return {
    key: issue.key,
    summary,
    project: project.key,
    url: `${jiraBaseUrl}/browse/${issue.key}`,
    type: {
      name: type.name,
      icon: type.iconUrl,
    },
  };
};

const filterIssuesByProject = (issues: JIRAIssueDetails[]) => {
  // TODO: Add projects as a GH Action input
  const validProjects = ['WT', 'AUP'];
  return issues.filter((issue) => validProjects.includes(issue.project));
};

const sortIssuesByProjectAndId = (issues: JIRAIssueDetails[]) => {
  return issues.sort((a, b) => {
    const [projectA, idNumberA] = a.key.split('-');
    const [projectB, idNumberB] = b.key.split('-');

    if (projectA === projectB) {
      return parseInt(idNumberA, 10) - parseInt(idNumberB, 10);
    }

    return projectA.localeCompare(projectB);
  });
};
