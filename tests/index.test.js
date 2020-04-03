const nock = require('nock')
const core = require('@actions/core')
const { Toolkit } = require('actions-toolkit')

describe('create-update-PR-in-forks', () => {
  let actionFn, tools, params

  beforeEach(() => {
    Toolkit.run = jest.fn(fn => { actionFn = fn })
    require('..')

    nock('https://api.github.com')
      .get(/\/repos\/.*\/.*\/forks/).reply(200, (_, body) => {
        return [{
          full_name: 'Glumli/repository_name'
        }]
      })
      .post(/\/repos\/.*\/.*\/git\/refs/).reply(200, (_, body) => {
        return {}
      })
      .post(/\/repos\/.*\/.*\/pulls/).reply(200, (_, body) => {
        return {}
      })

    tools = new Toolkit({
      logger: {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
      }
    })
    // Turn core.setOutput into a mocked noop
    jest.spyOn(core, 'setOutput')
      .mockImplementation(() => {})

    // Turn core.setFailed into a mocked noop
    jest.spyOn(core, 'setFailed')
      .mockImplementation(() => {})

    tools.exit.success = jest.fn()
    tools.exit.failure = jest.fn()

    // Ensure that the filename input isn't set at the start of a test
    delete process.env.INPUT_FILENAME
  })

  it('creates a new PR', async () => {
    tools.log.success = jest.fn()
    await actionFn(tools)
    expect(tools.log.success).toHaveBeenCalled()
    expect(tools.log.success.mock.calls[0][0][0].status).toEqual(200)
    expect(tools.log.success.mock.calls).toMatchSnapshot()
  })

  it('creates a new PR from a different template', async () => {
    process.env.INPUT_FILENAME = '.github/different-template.md'
    // tools.context.payload = { repository: { owner: { login: 'Glumli' }, name: 'waddup' } }
    await actionFn(tools)
    expect(tools.log.success).toHaveBeenCalled()
    expect(tools.log.success.mock.calls).toMatchSnapshot()
  })

  it('creates a new PR with some template variables', async () => {
    process.env.INPUT_FILENAME = '.github/variables.md'
    await actionFn(tools)
    expect(tools.log.success).toHaveBeenCalled()
    expect(tools.log.success.mock.calls).toMatchSnapshot()
  })

  it('creates a new PR with labels as comma-delimited strings', async () => {
    process.env.INPUT_FILENAME = '.github/split-strings.md'
    await actionFn(tools)
    expect(params).toMatchSnapshot()
    expect(tools.log.success).toHaveBeenCalled()
    expect(tools.log.success.mock.calls).toMatchSnapshot()
  })
})
