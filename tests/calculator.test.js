'use strict';

const { calculateConfidenceScore, getConfidenceStatus, normaliseScale } = require('../src/calculator');

// ---------------------------------------------------------------------------
// normaliseScale
// ---------------------------------------------------------------------------
describe('normaliseScale', () => {
    test('score of 1 maps to 0', () => {
        expect(normaliseScale(1)).toBe(0);
    });

    test('score of 5 maps to 100', () => {
        expect(normaliseScale(5)).toBe(100);
    });

    test('score of 3 maps to 50', () => {
        expect(normaliseScale(3)).toBe(50);
    });
});

// ---------------------------------------------------------------------------
// calculateConfidenceScore – formula correctness
// ---------------------------------------------------------------------------
describe('calculateConfidenceScore', () => {
    test('returns correct score for all-maximum inputs', () => {
        // KPI=100, Project=100, Stakeholder=5 (norm 100), Risk=1 (norm 0)
        // = 100*0.4 + 100*0.3 + 100*0.2 - 0*0.1 = 40+30+20 = 90
        expect(calculateConfidenceScore({
            kpiPerformance: 100,
            projectCompletion: 100,
            stakeholderEngagement: 5,
            riskLevel: 1,
        })).toBe(90);
    });

    test('returns correct score for all-minimum inputs', () => {
        // KPI=0, Project=0, Stakeholder=1 (norm 0), Risk=5 (norm 100)
        // = 0 + 0 + 0 - 100*0.1 = -10 → clamped to 0
        expect(calculateConfidenceScore({
            kpiPerformance: 0,
            projectCompletion: 0,
            stakeholderEngagement: 1,
            riskLevel: 5,
        })).toBe(0);
    });

    test('high risk reduces the overall confidence score', () => {
        const lowRisk = calculateConfidenceScore({
            kpiPerformance: 70,
            projectCompletion: 70,
            stakeholderEngagement: 3,
            riskLevel: 1,
        });
        const highRisk = calculateConfidenceScore({
            kpiPerformance: 70,
            projectCompletion: 70,
            stakeholderEngagement: 3,
            riskLevel: 5,
        });
        expect(highRisk).toBeLessThan(lowRisk);
    });

    test('higher stakeholder engagement increases confidence score', () => {
        const low = calculateConfidenceScore({
            kpiPerformance: 60,
            projectCompletion: 60,
            stakeholderEngagement: 1,
            riskLevel: 3,
        });
        const high = calculateConfidenceScore({
            kpiPerformance: 60,
            projectCompletion: 60,
            stakeholderEngagement: 5,
            riskLevel: 3,
        });
        expect(high).toBeGreaterThan(low);
    });

    test('result is clamped to a maximum of 100', () => {
        expect(calculateConfidenceScore({
            kpiPerformance: 100,
            projectCompletion: 100,
            stakeholderEngagement: 5,
            riskLevel: 1,
        })).toBeLessThanOrEqual(100);
    });

    test('result is clamped to a minimum of 0', () => {
        expect(calculateConfidenceScore({
            kpiPerformance: 0,
            projectCompletion: 0,
            stakeholderEngagement: 1,
            riskLevel: 5,
        })).toBeGreaterThanOrEqual(0);
    });

    test('calculates a known mid-range score correctly', () => {
        // KPI=80, Project=60, Stakeholder=4 (norm 75), Risk=2 (norm 25)
        // = 80*0.4 + 60*0.3 + 75*0.2 - 25*0.1
        // = 32 + 18 + 15 - 2.5 = 62.5
        expect(calculateConfidenceScore({
            kpiPerformance: 80,
            projectCompletion: 60,
            stakeholderEngagement: 4,
            riskLevel: 2,
        })).toBe(62.5);
    });
});

// ---------------------------------------------------------------------------
// getConfidenceStatus – traffic-light indicator mapping
// ---------------------------------------------------------------------------
describe('getConfidenceStatus', () => {
    test('score of 70 maps to High / green', () => {
        const status = getConfidenceStatus(70);
        expect(status.label).toBe('High');
        expect(status.colour).toBe('green');
    });

    test('score of 100 maps to High / green', () => {
        const status = getConfidenceStatus(100);
        expect(status.label).toBe('High');
        expect(status.colour).toBe('green');
    });

    test('score of 69 maps to Medium / amber', () => {
        const status = getConfidenceStatus(69);
        expect(status.label).toBe('Medium');
        expect(status.colour).toBe('amber');
    });

    test('score of 40 maps to Medium / amber', () => {
        const status = getConfidenceStatus(40);
        expect(status.label).toBe('Medium');
        expect(status.colour).toBe('amber');
    });

    test('score of 39 maps to Low / red', () => {
        const status = getConfidenceStatus(39);
        expect(status.label).toBe('Low');
        expect(status.colour).toBe('red');
    });

    test('score of 0 maps to Low / red', () => {
        const status = getConfidenceStatus(0);
        expect(status.label).toBe('Low');
        expect(status.colour).toBe('red');
    });
});
