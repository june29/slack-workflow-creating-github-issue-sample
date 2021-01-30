require('dotenv').config()
const { App, SocketModeReceiver, WorkflowStep } = require('@slack/bolt');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  baseUrl: process.env.GITHUB_API_BASE_URL,
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

const socketModeReceiver = new SocketModeReceiver({
  appToken: process.env.SLACK_APP_TOKEN,
});

const app = new App({
  receiver: socketModeReceiver,
  token: process.env.SLACK_BOT_TOKEN
});

const ws = new WorkflowStep('create_github_issue', {
  edit: async ({ ack, step, configure }) => {
    console.log(step);
    await ack();

    const blocks = [
      {
        type: 'input',
        block_id: 'issue_title_input',
        element: {
          type: 'plain_text_input',
          action_id: 'title',
          placeholder: {
            type: 'plain_text',
            text: 'Issue title',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Issue title',
        },
      },
      {
        type: 'input',
        block_id: 'issue_description_input',
        element: {
          type: 'plain_text_input',
          action_id: 'description',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Issue description',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Issue description',
        },
      },
    ];

    await configure({ blocks });
  },
  save: async ({ ack, step, view, update }) => {
    console.log(step);
    await ack();

    const { values } = view.state;
    const issueTitle = values.issue_title_input.title;
    const issueDescription = values.issue_description_input.description;

    const inputs = {
      issueTitle: { value: issueTitle.value },
      issueDescription: { value: issueDescription.value }
    };

    const outputs = [
      {
        type: 'text',
        name: 'issueTitle',
        label: 'Issue title',
      },
      {
        type: 'text',
        name: 'issueDescription',
        label: 'Issue description',
      },
      {
        type: 'text',
        name: 'issueUrl',
        label: 'Issue URL',
      }
    ];

    await update({ inputs, outputs });
  },
  execute: async ({ step, complete, fail }) => {
    const { inputs } = step;

    const result = await octokit.issues.create({
      owner: process.env.GITHUB_REPOSITORY.split("/")[0],
      repo: process.env.GITHUB_REPOSITORY.split("/")[1],
      title: inputs.issueTitle.value,
      body: inputs.issueDescription.value,
    });

    const outputs = {
      issueTitle: inputs.issueTitle.value,
      issueDescription: inputs.issueDescription.value,
      issueUrl: result.data.html_url,
    };

    console.log(inputs, outputs);
    await complete({ outputs });
  },
});

app.step(ws);

(async () => {
  await app.start();

  console.log('⚡️ Bolt app started');
})();
