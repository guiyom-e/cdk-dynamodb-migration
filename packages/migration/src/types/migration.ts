export interface MigrateActionResponseProps {
  version: number;
  status: string;
}

export interface MigrateActionInputProps {
  version: number;
}

export interface Migration {
  up: (props: MigrateActionInputProps) => Promise<MigrateActionResponseProps>;
  down: (props: MigrateActionInputProps) => Promise<MigrateActionResponseProps>;
}
