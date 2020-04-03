const core = require('@actions/core')
const { Toolkit } = require('actions-toolkit')
const fm = require('front-matter')
const nunjucks = require('nunjucks')
const dateFilter = require('nunjucks-date-filter')

function repoStringToObject (repoString) {
  const repoArray = repoString.split('/')
  return { owner: repoArray[0], repo: repoArray[1] }
}

Toolkit.run(async tools => {
  const template = tools.inputs.filename || '.github/ISSUE_TEMPLATE.md'
  const env = nunjucks.configure({ autoescape: false })
  env.addFilter('date', dateFilter)

  const templateVariables = {
    ...tools.context,
    date: Date.now()
  }

  // Get the file
  tools.log.debug('Reading from file', template)
  const file = tools.getFile(template)

  // Grab the front matter as JSON
  const { attributes, body } = fm(file)
  tools.log(`Front matter for ${template} is`, attributes)

  const templated = {
    body: env.renderString(body, templateVariables),
    title: env.renderString(attributes.title, templateVariables)
  }

  tools.log.debug('Templates compiled', templated)
  tools.log.info(`Creating new issue ${templated.title}`)

  let forkRepos
  const repository = tools.context.repo
  try {
    // Fetch fork information
    const forkResponse = await tools.github.repos.listForks(repository)
    forkRepos = forkResponse.data.map(fork => {
      return repoStringToObject(fork.full_name)
    })
  } catch (error) {
    // Log the error message
    const errorMessage = `An error occurred while creating the issue. This might be caused by a malformed issue title, or a typo in the labels or assignees. Check ${template}!`
    tools.log.error(errorMessage)
    tools.log.error(error)

    // The error might have more details
    if (error.errors) tools.log.error(error.errors)

    // Exit with a failing status
    core.setFailed(errorMessage + '\n\n' + error.message)
    tools.exit.failure()
  }

  // Create the new branch
  const tagName = tools.context.payload.release.tag_name
  const sha = tools.context.sha
  try {
    const payload = {
      ...repository,
      ref: `refs/heads/${tagName}`,
      sha
    }
    await tools.github.git.createRef(payload)
  } catch (error) {
    tools.log.error(error)
    tools.exit.failure()
  }

  let pullRequests
  try {
    pullRequests = await forkRepos.map(async (repo) => {
      const payload = {
        ...templated,
        ...repo,
        base: 'master',
        head: `${tools.context.repo.owner}:${tagName}`
      }
      return await tools.github.pulls.create(payload)
    })
  } catch (error) {
    const errorMessage = 'Somethings wrong with creating the PRs forks'
    tools.log.error(errorMessage)
    tools.log.error(error)
    tools.exit.failure()
  }
  tools.log.success(pullRequests)
}, {
  secrets: ['GITHUB_TOKEN']
})
