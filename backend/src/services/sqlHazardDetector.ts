export interface SqlHazard {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  statement: string;
  description: string;
}

export interface SqlAnalysisResult {
  hasMigration: boolean;
  hazardScore: number; // 0-100
  hazards: SqlHazard[];
  summary: string;
}

// ponytail: Regex-based DDL hazard detector covers all 6 standard hazard classes without
// needing heavy AST dependencies. Upgrade path: node-sql-parser in Phase 6.
export class SqlHazardDetector {
  public static analyzeSql(sqlContent: string): SqlAnalysisResult {
    if (!sqlContent || !sqlContent.trim()) {
      return {
        hasMigration: false,
        hazardScore: 0,
        hazards: [],
        summary: 'No database migration or SQL statements detected.',
      };
    }

    const hazards: SqlHazard[] = [];
    const normalized = sqlContent.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // 1. DROP TABLE (CRITICAL)
    if (/\bDROP\s+TABLE\b/i.test(normalized)) {
      hazards.push({
        type: 'DROP_TABLE',
        severity: 'CRITICAL',
        statement: 'DROP TABLE',
        description: 'Destructive table deletion will cause irreversible data loss and immediate downtime.',
      });
    }

    // 2. DROP COLUMN (HIGH)
    if (/\bALTER\s+TABLE\s+[\w."]+\s+DROP\s+COLUMN\b/i.test(normalized) || /\bDROP\s+COLUMN\b/i.test(normalized)) {
      hazards.push({
        type: 'DROP_COLUMN',
        severity: 'HIGH',
        statement: 'DROP COLUMN',
        description: 'Dropping a column will break active application instances still referencing it.',
      });
    }

    // 3. CREATE INDEX without CONCURRENTLY (HIGH in PostgreSQL)
    const createIndexRegex = /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w."]+\s+ON\b/i;
    if (createIndexRegex.test(normalized) && !/\bCONCURRENTLY\b/i.test(normalized)) {
      hazards.push({
        type: 'INDEX_WITHOUT_CONCURRENTLY',
        severity: 'HIGH',
        statement: 'CREATE INDEX (non-concurrent)',
        description: 'Creating an index without CONCURRENTLY acquires an exclusive table lock blocking writes.',
      });
    }

    // 4. ADD COLUMN with NOT NULL without default (HIGH)
    if (/\bADD\s+(?:COLUMN\s+)?[\w."]+\s+[\w().]+\s+NOT\s+NULL\b/i.test(normalized) && !/\bDEFAULT\b/i.test(normalized)) {
      hazards.push({
        type: 'ADD_COLUMN_NOT_NULL_NO_DEFAULT',
        severity: 'HIGH',
        statement: 'ADD COLUMN ... NOT NULL without DEFAULT',
        description: 'Adding a non-nullable column without a default value fails on non-empty tables and locks the table.',
      });
    }

    // 5. TRUNCATE TABLE (CRITICAL)
    if (/\bTRUNCATE\s+TABLE\b/i.test(normalized) || /\bTRUNCATE\b/i.test(normalized)) {
      hazards.push({
        type: 'TRUNCATE_TABLE',
        severity: 'CRITICAL',
        statement: 'TRUNCATE TABLE',
        description: 'Truncating a table immediately wipes all existing rows.',
      });
    }

    // 6. RENAME TABLE or COLUMN (MEDIUM)
    if (/\bRENAME\s+(?:TABLE|COLUMN|TO)\b/i.test(normalized)) {
      hazards.push({
        type: 'RENAME_OBJECT',
        severity: 'MEDIUM',
        statement: 'RENAME TABLE/COLUMN',
        description: 'Renaming schema objects without backward compatibility aliases causes query failures during deployment.',
      });
    }

    // Calculate composite hazard score
    let score = 0;
    if (hazards.some((h) => h.severity === 'CRITICAL')) {
      score = 95;
    } else if (hazards.some((h) => h.severity === 'HIGH')) {
      score = 75;
    } else if (hazards.some((h) => h.severity === 'MEDIUM')) {
      score = 50;
    } else if (hazards.length > 0) {
      score = 25;
    } else {
      score = 15; // Low baseline for safe migrations (e.g. ADD COLUMN with DEFAULT)
    }

    return {
      hasMigration: true,
      hazardScore: score,
      hazards,
      summary: hazards.length > 0
        ? `Detected ${hazards.length} SQL migration hazard(s): ${hazards.map((h) => h.type).join(', ')}`
        : 'Migration contains safe, non-blocking schema modifications.',
    };
  }
}
