import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot } from '@fortawesome/free-solid-svg-icons';
import BotTestCompletionStatus from './BotTestCompletionStatus';

const TestQueueCompletionStatusListItem = ({
    runnableTestsLength,
    testPlanRun,
    id
}) => {
    const { testResultsLength, tester } = testPlanRun;
    const isBot = useMemo(
        () => tester.username.toLowerCase().slice(-3) === 'bot',
        [tester]
    );

    const renderTesterInfo = () => {
        if (isBot) {
            return (
                <span aria-describedby={id}>
                    <FontAwesomeIcon icon={faRobot} />
                    {tester.username}
                </span>
            );
        } else {
            return (
                <a
                    href={`https://github.com/` + `${tester.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    // Allows ATs to read the number of
                    // completed tests when tabbing to this
                    // link
                    aria-describedby={id}
                >
                    {tester.username}
                </a>
            );
        }
    };

    const renderTestCompletionStatus = () => {
        if (isBot) {
            return (
                <BotTestCompletionStatus
                    id={id}
                    testPlanRun={testPlanRun}
                    runnableTestsLength={runnableTestsLength}
                />
            );
        } else {
            return (
                <div id={id} className="text-secondary">
                    {`${testResultsLength} of ${runnableTestsLength} tests complete`}
                </div>
            );
        }
    };

    return (
        <li className="mb-2 text-nowrap">
            {renderTesterInfo()}
            {renderTestCompletionStatus()}
        </li>
    );
};

TestQueueCompletionStatusListItem.propTypes = {
    runnableTestsLength: PropTypes.number.isRequired,
    testPlanRun: PropTypes.shape({
        testResultsLength: PropTypes.number.isRequired,
        tester: PropTypes.shape({
            username: PropTypes.string.isRequired
        }).isRequired
    }).isRequired,
    id: PropTypes.string.isRequired
};

export default TestQueueCompletionStatusListItem;
