const { Base64 } = require('js-base64');
const hash = require('object-hash');

/**
 * The LocationOfData / PopulatedData API in GraphQL allows API consumers to
 * easily load all the data knowable from a single ID, e.g. giving the ID of a
 * Assertion will allow you to load the Test as well as the TestPlanVersion and
 * TestPlan.
 *
 * Generally the API works using the associations defined in Sequelize. But that
 * will not work with types like Test, Scenario, Assertion, TestResult,
 * ScenarioResult and AssertionResult, which are all are defined in the
 * unstructured JSON parts of database.
 *
 * The implementation here encodes a locationOfData into the IDs of those types,
 * allowing the PopulatedData resolver to decode the record's context without
 * needing to bend over backwards to reconstruct it.
 */

/**
 * To keep the encoded IDs as short as possible, the keys are replaced with a
 * number.
 *
 * You can add values here, but never change existing numbers.
 */
const shortener = {
    testPlanId: 1,
    testPlanVersionId: 2,
    testId: 3,
    scenarioId: 4,
    assertionId: 5,
    testPlanReportId: 6,
    testPlanTargetId: 7,
    browserId: 8,
    browserVersion: 9,
    atId: 10,
    atVersion: 11,
    testPlanRunId: 12,
    testResultId: 13,
    scenarioResultId: 14,
    assertionResultId: 15
};

const decoder = Object.fromEntries(
    Object.entries(shortener).map(([key, value]) => [value, key])
);

/**
 * Encode a locationOfData into an ID for recovery later. It is not exported
 * from this file because consumers are expected to use a dedicated function
 * like createTestResultId for their situation.
 * @param {object} locationOfData - locationOfData as defined in GraphQL
 * @param {object} uniqueness - Additional data which will be hashed into
 * the ID to make sure it is unique, in cases where the locationOfData would
 * otherwise be identical for multiple entities. It is not recoverable.
 * @returns {string} - A PopulatedData-aware ID
 */
const encodeLocationOfDataId = (locationOfData, uniqueness = null) => {
    const shortenedLocationOfData = Object.fromEntries(
        Object.entries(locationOfData).map(([key, value]) => {
            const shortened = shortener[key];
            if (!shortened) {
                throw new Error(`Unrecognized locationOfData key: "${key}"`);
            }
            return [shortened, value];
        })
    );
    const base64hash = Base64.encode(
        hash([shortenedLocationOfData, uniqueness])
    );
    // The hash is needed for producing uniqueness, but the reason for
    // splitting it up and putting it at the beginning and end is to
    // mitigate the fact that the random characters making up Base64 data
    // would otherwise look extremely similar.
    const startChars = base64hash.substr(0, 5);
    const endChars = base64hash.substr(5, 5);
    const encoded = Base64.encode(
        JSON.stringify(shortenedLocationOfData),
        true
    );
    return `${startChars}${encoded}${endChars}`;
};

/**
 * Decode the locationOfData as needed in the populatedData resolver.
 * @param {string} id - A PopulatedData-aware ID
 * @returns {object} - locationOfData as defined in GraphQL
 */
const decodeLocationOfDataId = id => {
    try {
        const encoded = id.substr(5, id.length - 10); // remove first and last 5
        const shortenedLocationOfData = JSON.parse(Base64.decode(encoded));
        const locationOfData = Object.fromEntries(
            Object.entries(shortenedLocationOfData).map(([key, value]) => {
                return [decoder[key], value];
            })
        );
        return locationOfData;
    } catch {
        throw new Error(
            `The ID ${id} is not a valid locationOfData ID. Make sure you ` +
                `are inputting an ID which was generated by the app, e.g. by ` +
                `the findOrCreateTestResult mutation.`
        );
    }
};

/**
 * Get the ID for a new Test.
 * @param {number} testPlanVersionId - ID of the TestPlanVersion hosting the Test.
 * @param {string} executionOrder - ID of the test the Test is pointing at.
 * @returns - a Test ID which is compatible with PopulatedData.
 */
const createTestId = (testPlanVersionId, executionOrder) =>
    encodeLocationOfDataId({ testPlanVersionId }, executionOrder);

/**
 * Get the ID for a new Scenario.
 * @param {number} testId - ID of the parent Test.
 * @param {string} scenarioIndex - the index in the Test's array of Scenarios.
 * @returns - a Scenario ID which is compatible with PopulatedData.
 */
const createScenarioId = (testId, scenarioIndex) =>
    encodeLocationOfDataId({ testId }, { scenarioIndex });

/**
 * Get the ID for a new Assertion.
 * @param {number} testId - ID of the parent Test.
 * @param {string} assertionIndex - the index in the Test's array of Assertions.
 * @returns - a Scenario ID which is compatible with PopulatedData.
 */
const createAssertionId = (testId, assertionIndex) =>
    encodeLocationOfDataId({ testId }, { assertionIndex });

/**
 * Get the ID for a new TestResult.
 * @param {number} testPlanRunId - ID of the TestPlanRun hosting the TestResult.
 * @param {string} testId - ID of the test the TestResult is pointing at.
 * @returns - a TestResult ID which is compatible with PopulatedData.
 */
const createTestResultId = (testPlanRunId, testId) =>
    encodeLocationOfDataId({ testPlanRunId }, testId);

/**
 * Get the ID for a new ScenarioResult.
 * @param {number} testResultId - ID of the parent TestResult.
 * @param {string} scenarioId - ID of the scenario the ScenarioResult is
 * pointing at.
 * @returns - a ScenarioResult ID which is compatible with PopulatedData.
 */
const createScenarioResultId = (testResultId, scenarioId) =>
    encodeLocationOfDataId({ testResultId }, scenarioId);

/**
 * Get the ID for a new AssertionResult.
 * @param {number} scenarioResultId - ID of the parent ScenarioResult.
 * @param {string} assertionId - ID of the assertion the AssertionResult is pointing
 * at.
 * @returns - an AssertionResult ID which is compatible with PopulatedData.
 */
const createAssertionResultId = (scenarioResultId, assertionId) =>
    encodeLocationOfDataId({ scenarioResultId }, assertionId);

module.exports = {
    createTestId,
    createScenarioId,
    createAssertionId,
    createTestResultId,
    createScenarioResultId,
    createAssertionResultId,
    decodeLocationOfDataId
};
