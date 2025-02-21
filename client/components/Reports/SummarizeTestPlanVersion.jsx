import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { differenceBy } from 'lodash';
import getMetrics from './getMetrics';
import { getTestPlanTargetTitle, getTestPlanVersionTitle } from './getTitles';
import { Breadcrumb, Button, Container, Table } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import DisclaimerInfo from '../DisclaimerInfo';

const FullHeightContainer = styled(Container)`
    min-height: calc(100vh - 64px);
`;

const SummarizeTestPlanVersion = ({ testPlanVersion, testPlanReports }) => {
    const { exampleUrl, designPatternUrl } = testPlanVersion.metadata;
    return (
        <FullHeightContainer id="main" as="main" tabIndex="-1">
            <Helmet>
                <title>
                    {getTestPlanVersionTitle(testPlanVersion)} | ARIA-AT Reports
                </title>
            </Helmet>
            <h1>{getTestPlanVersionTitle(testPlanVersion)}</h1>

            <Breadcrumb
                label="Breadcrumb"
                listProps={{
                    'aria-label': 'Breadcrumb Navigation'
                }}
            >
                <LinkContainer to="/reports">
                    <Breadcrumb.Item>
                        <FontAwesomeIcon icon={faHome} />
                        Test Reports
                    </Breadcrumb.Item>
                </LinkContainer>
                <Breadcrumb.Item active>
                    {getTestPlanVersionTitle(testPlanVersion)}
                </Breadcrumb.Item>
            </Breadcrumb>
            <h2>Introduction</h2>

            <DisclaimerInfo phase={testPlanVersion.phase} />
            <p>
                This page summarizes the test results for each AT and Browser
                which executed the Test Plan.
            </p>
            <h2>Metadata</h2>
            <ul>
                {exampleUrl ? (
                    <li>
                        <a href={exampleUrl} target="_blank" rel="noreferrer">
                            Example Under Test
                        </a>
                    </li>
                ) : null}
                {designPatternUrl ? (
                    <li>
                        <a
                            href={designPatternUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Design Pattern
                        </a>
                    </li>
                ) : null}
            </ul>

            {testPlanReports.map(testPlanReport => {
                if (testPlanReport.status === 'DRAFT') return null;
                const skippedTests = differenceBy(
                    testPlanReport.runnableTests,
                    testPlanReport.finalizedTestResults,
                    testOrTestResult =>
                        testOrTestResult.test?.id ?? testOrTestResult.id
                );
                const overallMetrics = getMetrics({ testPlanReport });

                const { at, browser } = testPlanReport;

                // Construct testPlanTarget
                const testPlanTarget = {
                    id: `${at.id}${browser.id}`,
                    at,
                    browser
                };

                return (
                    <Fragment key={testPlanReport.id}>
                        <h2>{getTestPlanTargetTitle(testPlanTarget)}</h2>
                        <DisclaimerInfo phase={testPlanVersion.phase} />
                        <LinkContainer
                            to={
                                `/report/${testPlanVersion.id}` +
                                `/targets/${testPlanReport.id}`
                            }
                        >
                            <Button variant="secondary" className="me-3">
                                View Complete Results
                            </Button>
                        </LinkContainer>
                        {skippedTests.length ? (
                            <Link
                                to={
                                    `/report/${testPlanVersion.id}` +
                                    `/targets/${testPlanReport.id}` +
                                    `#skipped-tests`
                                }
                            >
                                {skippedTests.length} Tests Were Skipped
                            </Link>
                        ) : null}
                        <Table
                            className="mt-3"
                            bordered
                            responsive
                            aria-label={
                                `Results for ` +
                                `${getTestPlanTargetTitle(testPlanTarget)}`
                            }
                        >
                            <thead>
                                <tr>
                                    <th>Test Name</th>
                                    <th>MUST-DO Behaviors</th>
                                    <th>SHOULD-DO Behaviors</th>
                                    <th>Unexpected Behaviors</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testPlanReport.finalizedTestResults.map(
                                    testResult => {
                                        const {
                                            requiredFormatted,
                                            optionalFormatted,
                                            unexpectedBehaviorsFormatted
                                        } = getMetrics({
                                            testResult
                                        });
                                        return (
                                            <tr key={testResult.id}>
                                                <td>
                                                    <Link
                                                        to={
                                                            `/report/${testPlanVersion.id}` +
                                                            `/targets/${testPlanReport.id}` +
                                                            `#result-${testResult.id}`
                                                        }
                                                    >
                                                        {testResult.test.title}
                                                    </Link>
                                                </td>
                                                <td>{requiredFormatted}</td>
                                                <td>{optionalFormatted}</td>
                                                <td>
                                                    {
                                                        unexpectedBehaviorsFormatted
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                                <tr>
                                    <td>All Tests</td>
                                    <td>{overallMetrics.requiredFormatted}</td>
                                    <td>{overallMetrics.optionalFormatted}</td>
                                    <td>
                                        {
                                            overallMetrics.unexpectedBehaviorsFormatted
                                        }
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </Fragment>
                );
            })}
        </FullHeightContainer>
    );
};

SummarizeTestPlanVersion.propTypes = {
    testPlanVersion: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string,
        phase: PropTypes.string,
        metadata: PropTypes.shape({
            exampleUrl: PropTypes.string.isRequired,
            designPatternUrl: PropTypes.string
        }).isRequired
    }).isRequired,
    testPlanReports: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            runnableTests: PropTypes.arrayOf(PropTypes.object).isRequired,
            finalizedTestResults: PropTypes.arrayOf(PropTypes.object)
        }).isRequired
    ).isRequired
};

export default SummarizeTestPlanVersion;
