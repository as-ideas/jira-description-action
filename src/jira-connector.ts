import axios, { AxiosInstance } from 'axios';
import { getInputs } from './action-inputs';
import { JIRA, JIRAIssueDetails, JiraSprintDetails } from './types';
import { toJiraIssueView } from './utils';

export class JiraConnector {
  client: AxiosInstance;
  JIRA_TOKEN: string;
  JIRA_BASE_URL: string;
  CLOUD_API_PREFIX: string;
  AGILE_API_PREFIX: string;

  constructor() {
    const { JIRA_TOKEN, JIRA_BASE_URL } = getInputs();

    this.JIRA_BASE_URL = JIRA_BASE_URL;
    this.JIRA_TOKEN = JIRA_TOKEN;
    this.CLOUD_API_PREFIX = '/api/3';
    this.AGILE_API_PREFIX = '/agile/1.0';

    const encodedToken = Buffer.from(JIRA_TOKEN).toString('base64');

    this.client = axios.create({
      baseURL: `${JIRA_BASE_URL}/rest`,
      timeout: 2000,
      headers: { Authorization: `Basic ${encodedToken}` },
    });
  }

  async getTicketDetails(key: string): Promise<JIRAIssueDetails> {
    console.log(`Fetching ${key} details from JIRA`);

    try {
      const issue: JIRA.Issue = await this.getIssue(key);
      return toJiraIssueView(issue, this.JIRA_BASE_URL);
    } catch (error) {
      console.log(
        'Error fetching details from JIRA. Please check if token you provide is built correctly & API key has all needed permissions. https://github.com/cakeinpanic/jira-description-action#jira-token'
      );
      if (error.response) {
        throw new Error(JSON.stringify(error.response.data, null, 4));
      }
      throw error;
    }
  }

  async getSprintDetails(id: string): Promise<JiraSprintDetails> {
    console.log(`Fetching sprint id=${id} details from JIRA`);

    try {
      const { name, goal } = await this.getSprintInfo(id);
      const { issues } = await this.getSprintIssues(id);

      return {
        id,
        name,
        goal,
        issues: issues.map((issue) => toJiraIssueView(issue, this.JIRA_BASE_URL)),
      };
    } catch (error) {
      console.log(
        'Error fetching details from JIRA. Please check if token you provide is built correctly & API key has all needed permissions. https://github.com/cakeinpanic/jira-description-action#jira-token'
      );
      if (error.response) {
        throw new Error(JSON.stringify(error.response.data, null, 4));
      }
      throw error;
    }
  }

  async getIssue(id: string): Promise<JIRA.Issue> {
    const url = `${this.CLOUD_API_PREFIX}/issue/${id}?fields=project,summary,issuetype`;
    const response = await this.client.get<JIRA.Issue>(url);
    return response.data;
  }

  async getSprintIssues(id: string): Promise<JIRA.SprintIssues> {
    const jql = encodeURI(`sprint = ${id} and issuetype NOT IN ("Technical task")`);
    const url = `${this.CLOUD_API_PREFIX}/search?jql=${jql}&fields=summary,issuetype,project`;
    const response = await this.client.get<JIRA.SprintIssues>(url);
    return response.data;
  }

  async getSprintInfo(id: string): Promise<JIRA.SprintInfo> {
    const url = `${this.AGILE_API_PREFIX}/sprint/${id}`;
    const response = await this.client.get<JIRA.SprintInfo>(url);
    return response.data;
  }
}
