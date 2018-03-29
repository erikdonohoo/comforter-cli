## Comforter CLI tool

Connects to a comforter instance and help send coverage data to be logged

#### Usage
`npm install -g comforter-cli`
`comforter-cli (--path <path-to-lcov-info-file> OR --totalLines <lines> --totalCovered <lines>) --name <project-name> --branch <branch-name> --project <project-id> --commit <sha> --apiKey <key> [--zip <path-to-html-coverage>]`

* [x] Accept path to generated coverage html and zip and send to Comforter
* [ ] Use `npm cli` to avoid running tests in exec, allowing coverage and better testing (see [jshint](https://github.com/jshint/jshint) repo for examples)
