export interface ServiceNode {
  id: string;
  name: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  currentErrorRate: string;
}

export interface DependencyEdge {
  sourceId: string;
  targetId: string;
  depType: 'SERVICE' | 'DATABASE' | 'QUEUE' | 'API_GATEWAY' | 'CACHE' | 'THIRD_PARTY';
}

export interface BlastRadiusResult {
  servicesCount: number;
  databasesCount: number;
  apisCount: number;
  potentialUsersImpacted: number;
  dependencyChain: string[];
  affectedServices: {
    id: string;
    name: string;
    tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
    relationship: 'DIRECT' | 'UPSTREAM' | 'DOWNSTREAM' | 'DATABASE';
    health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    currentErrorRate: string;
    blastRadiusScore: number;
  }[];
  overallScore: number; // 0-100
}

export class BlastRadiusAnalyzer {
  public static calculate(
    rootServiceId: string,
    services: Map<string, ServiceNode>,
    dependencies: DependencyEdge[]
  ): BlastRadiusResult {
    const root = services.get(rootServiceId);
    const affectedServices: BlastRadiusResult['affectedServices'] = [];
    const visited = new Set<string>();
    const dependencyChain: string[] = [];

    if (root) {
      visited.add(root.id);
      dependencyChain.push(root.name);
      affectedServices.push({
        id: root.id,
        name: root.name,
        tier: root.tier,
        relationship: 'DIRECT',
        health: root.health,
        currentErrorRate: root.currentErrorRate,
        blastRadiusScore: root.tier === 'TIER_1' ? 95 : root.tier === 'TIER_2' ? 65 : 35,
      });
    }

    // BFS traversal for downstream services & databases up to depth 3
    let currentQueue = [rootServiceId];
    let depth = 0;
    let databasesCount = 0;
    let apisCount = 0;

    while (currentQueue.length > 0 && depth < 3) {
      depth++;
      const nextQueue: string[] = [];

      for (const currId of currentQueue) {
        const outgoing = dependencies.filter((d) => d.sourceId === currId);
        for (const edge of outgoing) {
          if (edge.depType === 'DATABASE') {
            databasesCount++;
          }
          if (edge.depType === 'API_GATEWAY' || edge.depType === 'THIRD_PARTY') {
            apisCount++;
          }

          if (!visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            const targetNode = services.get(edge.targetId);
            if (targetNode) {
              dependencyChain.push(targetNode.name);
              const tierScore = targetNode.tier === 'TIER_1' ? 85 : targetNode.tier === 'TIER_2' ? 55 : 25;
              const distanceDecay = depth === 1 ? 1.0 : depth === 2 ? 0.75 : 0.5;
              const nodeScore = Math.round(tierScore * distanceDecay);

              affectedServices.push({
                id: targetNode.id,
                name: targetNode.name,
                tier: targetNode.tier,
                relationship: edge.depType === 'DATABASE' ? 'DATABASE' : 'DOWNSTREAM',
                health: targetNode.health,
                currentErrorRate: targetNode.currentErrorRate,
                blastRadiusScore: nodeScore,
              });

              nextQueue.push(targetNode.id);
            }
          }
        }
      }
      currentQueue = nextQueue;
    }

    const servicesCount = affectedServices.filter((s) => s.relationship !== 'DATABASE').length;
    const hasTier1 = affectedServices.some((s) => s.tier === 'TIER_1');
    const potentialUsers = hasTier1 ? 24500 : servicesCount > 2 ? 8500 : 1200;

    const maxNodeScore = Math.max(...affectedServices.map((s) => s.blastRadiusScore), 20);
    const overallScore = Math.min(100, Math.round(maxNodeScore * (1 + servicesCount * 0.05)));

    return {
      servicesCount,
      databasesCount: Math.max(databasesCount, 1),
      apisCount: Math.max(apisCount, 1),
      potentialUsersImpacted: potentialUsers,
      dependencyChain,
      affectedServices,
      overallScore,
    };
  }
}
