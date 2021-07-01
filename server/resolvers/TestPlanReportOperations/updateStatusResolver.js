const { AuthenticationError } = require('apollo-server');
const {
    getTestPlanReportById,
    updateTestPlanReport
} = require('../../models/services/TestPlanReportService');
const conflictsResolver = require('../TestPlanReport/conflictsResolver');
const isCompleteResolver = require('../TestPlanRun/isCompleteResolver');
const populatedDataResolver = require('../PopulatedData');

const updateStatusResolver = async (
    { parentContext: { id: testPlanReportId } },
    { status: status },
    { user }
) => {
    if (!user.roles.includes('ADMIN')) {
        throw new AuthenticationError();
    }

    const testPlanReport = await getTestPlanReportById(testPlanReportId);

    const conflicts = conflictsResolver(testPlanReport);
    if (conflicts.length > 0) {
        throw new Error('Cannot finalize test plan report due to conflicts');
    }

    const isIncomplete = testPlanReport.testPlanRuns.find(
        testPlanRun => !isCompleteResolver(testPlanRun)
    );

    if (isIncomplete) {
        throw new Error(
            'Cannot finalize test plan due to incomplete test runs'
        );
    }

    await updateTestPlanReport(testPlanReportId, { status });

    return populatedDataResolver({
        parentContext: { locationOfData: { testPlanReportId } }
    });
};

module.exports = updateStatusResolver;