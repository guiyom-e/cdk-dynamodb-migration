export interface MigrateActionResponseProps {
  status: string;
}

export type MigrationHandler = () => Promise<MigrateActionResponseProps>;

export interface Migration {
  id: number;
  description?: string;
  up: MigrationHandler | undefined;
  down: MigrationHandler | undefined;
}
