/**
 * Benefits Confidence Calculator
 *
 * Calculates a confidence score for a benefit based on key project indicators.
 *
 * Formula:
 *   Confidence = (KPI% × 0.4) + (ProjectCompletion% × 0.3)
 *              + (StakeholderEngagement_normalised × 0.2)
 *              - (RiskLevel_normalised × 0.1)
 *
 * Stakeholder engagement (1–5) and risk level (1–5) are normalised to 0–100
 * before applying the weights. The final score is clamped to [0, 100].
 */

/**
 * Normalise a 1–5 scale value to a 0–100 percentage.
 * @param {number} value - Value on a 1–5 scale.
 * @returns {number} Normalised value 0–100.
 */
function normaliseScale(value) {
    return ((value - 1) / 4) * 100;
}

/**
 * Calculate the confidence score for a benefit.
 *
 * @param {object} inputs
 * @param {number} inputs.kpiPerformance        - KPI performance percentage (0–100).
 * @param {number} inputs.projectCompletion     - Project completion percentage (0–100).
 * @param {number} inputs.stakeholderEngagement - Stakeholder engagement score (1–5).
 * @param {number} inputs.riskLevel             - Risk level (1–5).
 * @returns {number} Confidence score rounded to one decimal place (0–100).
 */
function calculateConfidenceScore({ kpiPerformance, projectCompletion, stakeholderEngagement, riskLevel }) {
    const stakeholderNorm = normaliseScale(stakeholderEngagement);
    const riskNorm = normaliseScale(riskLevel);

    const score =
        kpiPerformance * 0.4 +
        projectCompletion * 0.3 +
        stakeholderNorm * 0.2 -
        riskNorm * 0.1;

    // Clamp to 0–100 and round to one decimal place
    return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

/**
 * Return the confidence status band for a score.
 *
 * @param {number} score - Confidence score (0–100).
 * @returns {{ label: string, colour: string }} Status label and CSS colour class.
 */
function getConfidenceStatus(score) {
    if (score >= 70) {
        return { label: 'High', colour: 'green' };
    }
    if (score >= 40) {
        return { label: 'Medium', colour: 'amber' };
    }
    return { label: 'Low', colour: 'red' };
}

// Support both CommonJS (Jest tests) and ES module / browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateConfidenceScore, getConfidenceStatus, normaliseScale };
}
