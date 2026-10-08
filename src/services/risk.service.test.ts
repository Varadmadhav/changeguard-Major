import { describe, it, expect } from 'vitest';

import { riskService } from './risk.service';
import { mockChanges } from '../data/mockChanges';

const change = mockChanges.find(
    c => c.number === 1824
);


if (!change) {
    throw new Error('PR #1824 not found');
}

describe('ChangeGuard Risk Analysis', () => {

    it('should classify a low-risk change correctly', () => {
        const lowRiskChange = {
            ...change,
            number: 9999,
            filesChangedCount: 1,
            additions: 5,
            deletions: 1,
            historicalSimilarity: [],
            diffs: [],
            impact: {
                ...change.impact,
                servicesCount: 1,
                databasesCount: 0,
                apisCount: 1,
                potentialUsersImpacted: 10,
                affectedServices: [],
            },
        };

        const result =
            riskService.analyze(lowRiskChange);

        expect(result.score).toBeLessThan(70);
        expect(result.level).not.toBe('HIGH');
    });

    it('should detect a database migration with CONCURRENTLY as lower migration risk', () => {
        const safeMigrationChange = {
            ...change,
            number: 9998,
            diffs: [
                {
                    filename:
                        'migrations/safe_index.sql',
                    status: 'ADDED' as const,
                    additions: 2,
                    deletions: 0,
                    riskHighlights: [],
                    chunks: [
                        {
                            header: '@@ -0,0 +1,2 @@',
                            lines: [
                                {
                                    type: 'add' as const,
                                    text:
                                        '+CREATE UNIQUE INDEX CONCURRENTLY idx_test ON checkout_orders (idempotency_key);',
                                },
                                {
                                    type: 'add' as const,
                                    text: '+',
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const result =
            riskService.analyze(
                safeMigrationChange
            );

        const databaseFactor =
            result.factors.find(
                factor =>
                    factor.name ===
                    'Database Migration Risk'
            );

        expect(databaseFactor).toBeDefined();
        expect(databaseFactor?.score).toBe(70);

        expect(
            databaseFactor?.details.some(
                detail =>
                    detail.includes(
                        'Missing CONCURRENTLY'
                    )
            )
        ).toBe(false);
    });

    it('should detect multiple affected services', () => {
        const multiServiceChange = {
            ...change,
            number: 9997,
            impact: {
                ...change.impact,
                affectedServices: [
                    ...change.impact.affectedServices,
                    {
                        id: 'service-extra',
                        name: 'Notification Service',
                        tier: 'TIER_2' as const,
                        relationship: 'DOWNSTREAM' as const,
                        health: 'HEALTHY' as const,
                        currentErrorRate: '0.1%',
                        blastRadiusScore: 40,
                    },
                ],
            },
        };

        const result =
            riskService.analyze(
                multiServiceChange
            );

        const blastFactor =
            result.factors.find(
                factor =>
                    factor.name ===
                    'Dependency & Blast Radius Risk'
            );

        expect(blastFactor).toBeDefined();

        expect(
            blastFactor?.details.some(
                detail =>
                    detail.includes(
                        '5 affected services'
                    )
            )
        ).toBe(true);
    });

    it('should calculate PR #1824 risk as 78/100', () => {
        const result = riskService.analyze(change);

        expect(result.score).toBe(78);
        expect(result.level).toBe('HIGH');
    });

    it('should detect database migration risk', () => {
        const result = riskService.analyze(change);

        const databaseFactor =
            result.factors.find(
                factor =>
                    factor.name === 'Database Migration Risk'
            );

        expect(databaseFactor).toBeDefined();
        expect(databaseFactor?.score).toBeGreaterThanOrEqual(90);
    });

    it('should detect missing CONCURRENTLY', () => {
        const result = riskService.analyze(change);

        const databaseFactor =
            result.factors.find(
                factor =>
                    factor.name === 'Database Migration Risk'
            );

        expect(
            databaseFactor?.details.some(
                detail =>
                    detail.includes(
                        'Missing CONCURRENTLY'
                    )
            )
        ).toBe(true);
    });

    it('should calculate affected services', () => {
        const result = riskService.analyze(change);

        const blastRadiusFactor =
            result.factors.find(
                factor =>
                    factor.name ===
                    'Dependency & Blast Radius Risk'
            );

        expect(blastRadiusFactor).toBeDefined();

        expect(
            blastRadiusFactor?.details.some(
                detail =>
                    detail.includes(
                        '4 affected services'
                    )
            )
        ).toBe(true);
    });

    it('should calculate potential users affected', () => {
        const result = riskService.analyze(change);

        const blastRadiusFactor =
            result.factors.find(
                factor =>
                    factor.name ===
                    'Dependency & Blast Radius Risk'
            );

        expect(blastRadiusFactor).toBeDefined();

        expect(
            blastRadiusFactor?.details.some(
                detail =>
                    detail.includes(
                        'potential users'
                    )
            )
        ).toBe(true);
    });

    it('should generate risk factors', () => {
        const result = riskService.analyze(change);

        expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should generate a risk summary', () => {
        const result = riskService.analyze(change);

        expect(result.summary).toContain(
            'Risk score 78/100'
        );

        expect(result.summary).toContain(
            'HIGH'
        );
    });

    it('should generate risk reasons', () => {
        const result = riskService.analyze(change);

        expect(result.reasons.length).toBeGreaterThan(0);
    });

});