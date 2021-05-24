/* eslint no-console: 0 */

const path = require('path');
const nodegit = require('nodegit');
const { Client } = require('pg');
const fse = require('fs-extra');
const np = require('node-html-parser');
const db = require('../../models/index');
const validUrl = require('valid-url');

const args = require('minimist')(process.argv.slice(2), {
    alias: {
        h: 'help',
        c: 'commit'
    }
});

if (args.help) {
    console.log(`
Default use:
  No arguments:
    Fetch most recent aria-at tests to update database. By default, the latest commit on the default branch.
  Arguments:
    -h, --help
       Show this message.
    -c, --commit
       Import tests at the specified git commit

`);
    process.exit();
}

const client = new Client();

const ariaAtRepo = 'https://github.com/w3c/aria-at.git';
const DEFAULT_BRANCH = 'master';
const tmpDirectory = path.resolve(__dirname, 'tmp');
const testDirectory = path.resolve(tmpDirectory, 'tests');
const supportFile = path.resolve(testDirectory, 'support.json');

const ariaAtImport = {
    /**
     * Get all tests in the default HEAD commit for the repository
     */
    async getMostRecentTests() {
        await client.connect();

        fse.ensureDirSync(tmpDirectory);
        let repo = await nodegit.Clone(ariaAtRepo, tmpDirectory, {});
        console.log(`Cloned ${path.basename(ariaAtRepo)} to ${repo.workdir()}`);

        let commit;
        if (args.commit) {
            try {
                commit = await nodegit.Commit.lookup(repo, args.commit);
            } catch (error) {
                console.log(
                    `IMPORT FAILED! Cannot checkout repo at commit: ${args.commit}`
                );
                throw error;
            }

            await nodegit.Checkout.tree(repo, commit);
            await repo.setHeadDetached(commit);
        } else {
            let latestCommit = fse
                .readFileSync(
                    path.join(
                        tmpDirectory,
                        '.git',
                        'refs',
                        'heads',
                        DEFAULT_BRANCH
                    ),
                    'utf8'
                )
                .trim();
            commit = await nodegit.Commit.lookup(repo, latestCommit);
        }

        let commitDate = commit.date();
        let commitMessage = commit.message();
        let commitHash = commit.id().tostrS();

        const support = JSON.parse(fse.readFileSync(supportFile));
        const ats = support.ats;
        for (let at of ats) await this.upsertAt(at.name); // TODO: will we need to port support for at.key as well?

        const exampleNames = {};
        for (let example of support.examples)
            exampleNames[example.directory] = example.name;

        let exampleDirs = fse.readdirSync(testDirectory);
        for (let i = 0; i < exampleDirs.length; i++) {
            const exampleDir = exampleDirs[i];
            const subDirFullPath = path.join(testDirectory, exampleDir);
            const stat = fse.statSync(subDirFullPath); // folder stats

            // <repo>.git/tests/resources folder shouldn't be factored in the tests
            if (stat.isDirectory() && exampleDir !== 'resources') {
                const dataPath = path.join(subDirFullPath, 'data');
                const referencesCsvPath = path.join(dataPath, 'references.csv');

                let referencesCsv;
                try {
                    referencesCsv = fse.readFileSync(referencesCsvPath, {
                        encoding: 'utf-8'
                    });
                } catch (error) {
                    console.error(
                        `Reference file, ${referencesCsvPath}, does not exist!`
                    );
                    throw error;
                }

                // example url parsed from <repo>.git/tests/<directory>/data/references.csv
                const exampleRefLine = referencesCsv
                    .split('\n')
                    .filter(line => line.includes('example'));

                // designPattern url parsed from <repo>.git/tests/<directory>/data/references.csv
                const practiceGuidelinesRefLine = referencesCsv
                    .split('\n')
                    .filter(line => line.includes('designPattern'));

                const testPlanVersionId = await this.upsertTestPlanVersion(
                    exampleDir,
                    exampleNames[exampleDir],
                    ariaAtRepo,
                    commitHash,
                    commitMessage,
                    commitDate,
                    exampleRefLine,
                    practiceGuidelinesRefLine
                );

                let tests = fse.readdirSync(subDirFullPath);

                for (let j = 0; j < tests.length; j++) {
                    const test = tests[j];
                    const testFullPath = path.join(subDirFullPath, test);
                    if (
                        path.extname(test) === '.html' &&
                        test !== 'index.html'
                    ) {
                        // Get the test name from the html file
                        const htmlFile = path.relative(
                            tmpDirectory,
                            testFullPath
                        );
                        const root = np.parse(
                            fse.readFileSync(testFullPath, 'utf8'),
                            { script: true }
                        );
                        const testFullName = root.querySelector('title')
                            .innerHTML;

                        // Get the test order from the file name
                        const executionOrder = parseInt(test.split('-')[1]);

                        await this.upsertTestPlanVersionParsedTests(
                            testFullName,
                            htmlFile,
                            testPlanVersionId,
                            commitHash,
                            executionOrder
                        );
                    }
                }
            }
        }
    },

    /**
     * Gets At.id and inserts an At record if it doesn't exist
     * @param {string} atName - name of AT (Assistive Technology)
     * @returns {number} - returns At.id
     */
    async upsertAt(atName) {
        const atResult = await client.query(
            'SELECT id FROM "At" WHERE name=$1',
            [atName]
        );

        const at = atResult.rowCount
            ? atResult.rows[0]
            : await this.upsertRowReturnId(
                  'INSERT INTO "At" (name) VALUES($1) RETURNING id',
                  [atName]
              );
        return at.id;
    },

    /**
     * Gets TestPlanVersion.id and inserts a TestPlanVersion record if it doesn't exist
     * @param {string} exampleDir - the name of the test directory to be processed
     * @param {string} exampleName - the name of the example test being processed
     * @param {string} ariaAtRepo - the repository url the tests are being pulled from (ideally {@link https://github.com/w3c/aria-at.git})
     * @param {string} commitHash - the hash of the latest version of tests pulled from the {@param ariaAtRepo} repository
     * @param {string} commitMessage - the message of the latest version of tests pulled from the {@param ariaAtRepo} repository
     * @param {string} commitDate - the date of the latest versions of the tests pulled from the {@param ariaAtRepo} repository
     * @param {string[]} exampleRefLine - the example url link pulled from the references.csv file related to the test
     * @param {string[]} practiceGuidelinesRefLine - the APG (ARIA Practices Guidelines) link pulled from the references.csv file related to the test
     * @returns {number} - returns TestPlanVersion.id
     */
    async upsertTestPlanVersion(
        exampleDir,
        exampleName,
        ariaAtRepo,
        commitHash,
        commitMessage,
        commitDate,
        exampleRefLine,
        practiceGuidelinesRefLine
    ) {
        const getReferenceUrl = referenceLine => {
            let url = null;
            if (referenceLine.length) {
                const [referenceType, link] = referenceLine[0].split(',');
                if (validUrl.isUri(link)) url = link;
                else
                    console.error(
                        `WARNING: The ${referenceType} link ${link} is not valid for ${exampleName}. Not writing to database.`
                    );
            }
            return url;
        };

        const exampleUrl = getReferenceUrl(exampleRefLine);
        const designPattern = getReferenceUrl(practiceGuidelinesRefLine);

        let parsed = {
            title: '',
            gitRepo: ariaAtRepo,
            directory: exampleDir,
            minimumInputCount: 0,
            maximumInputCount: 0,
            tests: [],
            designPattern
        };

        // checking to see if unique testPlanVersion row (sourceGitCommitHash + directory provides a unique row)
        const testPlanVersionResult = await client.query(
            'SELECT id, "sourceGitCommitHash" FROM "TestPlanVersion" WHERE "sourceGitCommitHash"=$1 and parsed ->> \'directory\'=$2',
            [commitHash, exampleDir]
        );

        const testPlanVersion = testPlanVersionResult.rowCount
            ? testPlanVersionResult.rows[0]
            : await db.TestPlanVersion.create({
                  title: exampleName,
                  publishStatus: 'draft',
                  sourceGitCommitHash: commitHash,
                  sourceGitCommitMessage: commitMessage,
                  exampleUrl,
                  createdAt: commitDate,
                  parsed
              });
        return testPlanVersion.id;
    },

    /**
     * Checks TestPlanVersion.parsed.tests to see if it has the relevant test actions to run the test and inserts it if not
     * @param {string} testName - the name of the test
     * @param {string} file - the relative path to the test file in the repository (ideally {@link https://github.com/w3c/aria-at.git})
     * @param {number} testPlanVersionId - TestPlanVersion.id to be queried to update the TestPlanVersion.parsed.tests if necessary
     * @param {string} commitHash - the hash of the latest version of tests pulled from the repository (ideally {@link https://github.com/w3c/aria-at.git})
     * @param {number} executionOrder - the order in which the test step is executed (within the APG pattern)
     * @returns {number | null} - returns TestPlanVersion.id
     */
    async upsertTestPlanVersionParsedTests(
        testName,
        file,
        testPlanVersionId,
        commitHash,
        executionOrder
    ) {
        const testPlanVersionResult = await client.query(
            'SELECT id, "parsed" FROM "TestPlanVersion" WHERE id=$1 AND "sourceGitCommitHash"=$2',
            [testPlanVersionId, commitHash]
        );
        let testPlanVersion = testPlanVersionResult.rowCount
            ? testPlanVersionResult.rows[0]
            : null;

        // check to see if the test object already exists in tests dataset
        if (testPlanVersion) {
            const testStepsFound = testPlanVersion.parsed.tests.find(
                test => test.executionOrder === executionOrder
            );
            // short circuit method because parsed.tests.[action] is already present
            if (testStepsFound) return testPlanVersion.id;
        }

        const testsObject = {
            file,
            executionOrder,
            // single quotes need to be managed to match PostgreSQL standard when inserting into jsonb
            name: testName.replace(/'/g, "''")
        };

        const result = await this.upsertRowReturnId(
            `UPDATE "TestPlanVersion" SET "parsed" = jsonb_set("parsed"::jsonb, array['tests'], ("parsed" -> 'tests')::jsonb || '[${JSON.stringify(
                testsObject
            )}]'::jsonb) WHERE id=$1 AND "sourceGitCommitHash"=$2 RETURNING id`,
            [testPlanVersionId, commitHash]
        );

        if (result) {
            await this.upsertRowReturnId(
                `UPDATE "TestPlanVersion" SET "parsed" = "parsed" || CONCAT('{"maximumInputCount":', COALESCE("parsed" ->> 'maximumInputCount', '0')::int + 1, '}')::jsonb WHERE id=$1 AND "sourceGitCommitHash"=$2 RETURNING id`,
                [testPlanVersionId, commitHash]
            );
        }

        return result;
    },

    /**
     * PostgreSQL query handler to return a single result's id following a successful query
     * @param {string} query - the PostgreSQL query to be processed
     * @param {any[]} params - the params to be used when creating the PostgreSQL query
     * @returns {* | null} - returns id for queried row
     */
    async upsertRowReturnId(query, params) {
        let result;
        try {
            result = (await client.query(query, params)).rows[0];
        } catch (err) {
            console.log(
                `ERROR: Upsert Query '${query}' with parameters '[${params}]' should return id.`
            );
            throw err;
        }
        if (result && result.id) return result.id;
        return null;
    },

    /**
     * PostgreSQL query handler to return a single result following a successful query
     * @param {string} query - the PostgreSQL query to be processed
     * @param {any[]} params - the params to be used when creating the PostgreSQL query
     * @returns {* | null} - returns record for queried row
     */
    async performQuery(query, params) {
        let result;
        try {
            result = (await client.query(query, params)).rows[0];
        } catch (err) {
            console.log(
                `ERROR: Query '${query}' with parameters '[${params}]' should return id.`
            );
            throw err;
        }
        return result;
    }
};

ariaAtImport
    .getMostRecentTests()
    .then(
        () => console.log('Done, no errors'),
        err => {
            console.error(`Error found: ${err.stack}`);
            process.exitCode = 1;
        }
    )
    .finally(() => {
        // Delete temporary files
        fse.removeSync(tmpDirectory);
        client.end();
        process.exit();
    });
