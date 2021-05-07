/* eslint-disable jest/valid-expect */
const {
    sequelize,
    dataTypes,
    checkModelName,
    checkPropertyExists
} = require('sequelize-test-helpers');

const { expect, match } = require('./_modelsTestHelper');

const TestedConfigurationModel = require('../../models/TestedConfiguration');
const AtModel = require('../../models/At');
const AtVersionModel = require('../../models/AtVersion');
const BrowserModel = require('../../models/Browser');
const BrowserVersionModel = require('../../models/BrowserVersion');

describe('TestedConfigurationModel', () => {
    // A1
    const Model = TestedConfigurationModel(sequelize, dataTypes);
    const modelInstance = new Model();

    // A2
    checkModelName(Model)('TestedConfiguration');

    describe('properties', () => {
        // A3
        [
            'title',
            'publishStatus',
            'at',
            'atVersion',
            'browser',
            'browserVersion'
        ].forEach(checkPropertyExists(modelInstance));
    });

    describe('associations', () => {
        // A1
        const AT_ASSOCIATION = { as: 'at' };
        const AT_VERSION_ASSOCIATION = { as: 'atVersion' };
        const BROWSER_ASSOCIATION = { as: 'browser' };
        const BROWSER_VERSION_ASSOCIATION = { as: 'browserVersion' };

        // A2
        beforeEach(() => {
            // Model.associate({ At, AtVersion, Browser, BrowserVersion });
            Model.belongsTo(AtModel, AT_ASSOCIATION);
            Model.belongsTo(AtVersionModel, AT_VERSION_ASSOCIATION);
            Model.belongsTo(BrowserModel, BROWSER_ASSOCIATION);
            Model.belongsTo(BrowserVersionModel, BROWSER_VERSION_ASSOCIATION);
        });

        it('defined a belongsTo association with At', () => {
            // A3
            expect(Model.belongsTo).to.have.been.calledWith(
                AtModel,
                match(AT_ASSOCIATION)
            );
        });

        it('defined a belongsTo association with AtVersion', () => {
            // A3
            expect(Model.belongsTo).to.have.been.calledWith(
                AtVersionModel,
                match(AT_VERSION_ASSOCIATION)
            );
        });

        it('defined a belongsTo association with Browser', () => {
            // A3
            expect(Model.belongsTo).to.have.been.calledWith(
                BrowserModel,
                match(BROWSER_ASSOCIATION)
            );
        });

        it('defined a belongsTo association with BrowserVersion', () => {
            // A3
            expect(Model.belongsTo).to.have.been.calledWith(
                BrowserVersionModel,
                match(BROWSER_VERSION_ASSOCIATION)
            );
        });
    });
});
