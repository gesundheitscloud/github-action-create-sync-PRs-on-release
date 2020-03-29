const path = require('path')

Object.assign(process.env, {
  GITHUB_REPOSITORY: 'Glumli/waddup',
  GITHUB_ACTION: 'create-update-PR-in-forks',
  GITHUB_EVENT_PATH: path.join(__dirname, 'fixtures', 'event.json'),
  GITHUB_WORKSPACE: path.join(__dirname, 'fixtures')
})
