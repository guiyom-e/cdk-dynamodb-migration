# Contributing

## Guidelines

Feel free to open an issue or pull request!

## Useful commands

- `pnpm install` install the project
- `pnpm run build` build libraries
- `pnpm run test-linter` perform Eslint check
- `pnpm run test-type` check TypeScript compilation
- `pnpm run test-unit` run jest unit tests
- `pnpm run test` perform all tests

## Installation

### Requirements

- NodeJs >= 18.17 (you can use `nvm install` command)
- pnpm >= 8.7.1

### Installation steps

```sh
pnpm i
```

### Deploying `cdk-dynamodb-migrator` app

```sh
cd cdk-dynamodb-migrator
pnpm run deploy
```

#### Deploying a demo example

```sh
cd cdk-dynamodb-migrator
pnpm run build
cd ../demo/example
pnpm cdk deploy
```
