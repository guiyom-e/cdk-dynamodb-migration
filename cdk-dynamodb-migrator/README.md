# CDK migration construct and stack

Constructs to manage migration versions performed by a migration lambda

## Usage

It is possible to use either `MigrationConstruct` inside a stack, or use `MigrationStack` as an independent stack
These constructs contain a state machine (Step Functions) + a DynamoDB table to store current state and versions.

They take as input a Lambda function which should perform migrations using a version number strictly increasing.
Lambda input must extend: `{ targetVersion: number }`
Lambda output must extend: `{ status: 'SUCCEEDED' | 'FAILED', targetVersion: number }`
