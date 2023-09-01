interface MigrateActionResponseProps {
  version: number;
  status: string;
}

interface MigrateActionInputProps {
  version: number;
}

export interface Migration {
  up: (props: MigrateActionInputProps) => Promise<MigrateActionResponseProps>;
  down: (props: MigrateActionInputProps) => Promise<MigrateActionResponseProps>;
}
