const { AuthenticationError } = require('apollo-server');
const {
    removeTestPlanRunResultsByQuery
} = require('../../models/services/TestPlanRunService');
const populatedDataResolver = require('../PopulatedData');

const deleteTestPlanRunResultsResolver = async (
    { parentContext: { id: testPlanReportId } },
    { userId: testerUserId },
    { user }
) => {
    let roles = [...user.roles];
    if (user.roles.length && typeof user.roles[0] === 'object')
        roles = user.roles.map(role => role.name);

    // if user is admin OR user is tester and their id matches the currently
    // signed in user;
    // then continue
    if (
        !(
            roles.includes('ADMIN') ||
            (roles.includes('TESTER') && testerUserId == user.id)
        )
    ) {
        throw new AuthenticationError('Unauthorized');
    }

    await removeTestPlanRunResultsByQuery({
        testPlanReportId,
        testerUserId
    });
    return populatedDataResolver({
        parentContext: { locationOfData: { testPlanReportId } }
    });
};

module.exports = deleteTestPlanRunResultsResolver;
