import { gql } from '@apollo/client';

export const COLLECTION_JOB_ID_BY_TEST_PLAN_RUN_ID_QUERY = gql`
    query CollectionJobIdByTestPlanRunId($testPlanRunId: ID!) {
        collectionJobByTestPlanRunId(testPlanRunId: $testPlanRunId) {
            id
        }
    }
`;

export const MARK_COLLECTION_JOB_AS_FINISHED = gql`
    mutation MarkCollectionJobFinished($collectionJobId: ID!) {
        collectionJob(id: $collectionJobId) {
            markCollectionJobFinished {
                id
                status
            }
        }
    }
`;
