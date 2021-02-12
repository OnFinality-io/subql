![open grant logo](https://raw.githubusercontent.com/w3f/General-Grants-Program/master/src/badge_black.svg)
# Subquery
Almost every substrate project has a need to process and query data.
SubQuery is a open-source tool to provide a complete solution to this problem and will become core infrastructure for the Polkadot ecosystem.
We expect it to solve how to Extract, Transform, Persist, and Query data intially, and then how to Connect and Present data in the future.

SubQuery is NOT an ETL tool, the persisted data is minimized and shaped from the perspective of how it will be used.

SubQuery aims to support all substrate-compatible networks.

## Get Started
### Installation
```shell
npm i -g @subql/cli @subql/node @subql/query
```

### Step #1: Create a SubQuery project
1. use `@subql/cli` tool we provide to create a SubQuery project
  * it is written in typescript
  * user needs to config the project, define a schema and implement mapping functions
2. use `@subql/cli` to generate types from the given schema
3. use `@subql/cli` to compile and pack the SubQuery project

### Step #2: Run an indexer
Prerequisites
* A Postgres database
* Non-archive full node. If storage query is used, then an archive node is required to extract chain data. [OnFinality](https://onfinality.io/api_service) provides an archive node with a generous free tier that should be more than able to cover most cases.
* A moderately powerful computer to run an indexer in the background
  Then start our `@subql/node` with the path of local SubQuery project as arguments, `@subql/node` will handle the rest.

### Step #3: Run a Query Service
check our query component [`@subql/query`](packages/query)


## Components
* [`@subql/cli`](packages/cli)
* [`@subql/node`](packages/node)
* [`@subql/query`](packages/query)
* [`@subql/common`](packages/common)
* [`@subql/types`](packages/types)

## More Docs
[Docs](https://onfinality-io.github.io/subql/)

## Copyright

Copyright © 2020-2021 OnFinality Limited authors & contributors
