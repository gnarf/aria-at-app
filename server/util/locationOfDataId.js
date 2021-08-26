const { Base64 } = require('js-base64');
const hash = require('object-hash');

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
const locationOfDataId = {
    /**
     * Encode a locationOfData into an ID for recovery later.
     * @param {object} locationOfData - locationOfData as defined in GraphQL
     * @param {object} uniqueness - Additional data to encode to make sure the
     * IDs are unique, as in the case where the locationOfData would otherwise
     * be identical for multiple entities.
     * @returns {string} - A PopulatedData-aware ID
     */
    encode: (locationOfData, uniqueness = null) => {
        const shortenedLocationOfData = Object.fromEntries(
            Object.entries(locationOfData).map(([key, value]) => {
                const shortened = shortener[key];
                if (!shortened) {
                    throw new Error(`Unsupported location of data for ${key}`);
                }
                return [shortened, value];
            })
        );
        const hashed = hash([shortenedLocationOfData, uniqueness]);
        // Start chars and end chars have two uses, 1. to make sure no one can
        // decode the string, which would go against the design, and 2. to make
        // it easy to tell IDs apart with just a glance.
        const startChars = hashed.substr(0, 5);
        const endChars = hashed.substr(5, 5);
        const encoded = Base64.encode(
            JSON.stringify(shortenedLocationOfData),
            true
        );
        return `${startChars}${encoded}${endChars}`;
    },

    /**
     * Decode the locationOfData needed in the populatedData resolver.
     * @param {string} id - A PopulatedData-aware ID
     * @returns {object} - locationOfData as defined in GraphQL
     */
    decode: id => {
        const encoded = id.substr(5, id.length - 10); // remove first and last 5
        const shortenedLocationOfData = JSON.parse(Base64.decode(encoded));
        const locationOfData = Object.fromEntries(
            Object.entries(shortenedLocationOfData).map(([key, value]) => {
                return [decoder[key], value];
            })
        );
        return locationOfData;
    }
};

module.exports = locationOfDataId;
