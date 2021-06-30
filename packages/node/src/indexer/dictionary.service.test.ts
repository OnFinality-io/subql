// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { range } from 'lodash';
import { SubqueryProject } from '../configure/project.model';
import { DictionaryService } from './dictionary.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    dictionary: 'https://api.subquery.network/sq/subquery/dictionary-polkadot',
    types: {
      TestType: 'u32',
    },
  };
  project.dataSources = [];
  return project;
}

describe('DictionaryService', () => {
  it('return dictionary query result', async () => {
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const indexFilters = {
      existBlockHandler: false,
      existEventHandler: true,
      existExtrinsicHandler: true,
      eventFilters: [
        { module: 'staking', method: 'Bonded' },
        { module: 'balances', method: 'Reward' },
        { module: 'balances', method: 'Slash' },
      ],
      extrinsicFilters: [{ module: 'staking', method: 'bond' }],
    };
    const dic = await dictionaryService.getDictionary(
      startBlock,
      endBlock,
      batchSize,
      indexFilters,
    );

    expect(dic.batchBlocks.length).toBeGreaterThan(1);
  }, 500000);

  it('return undefined when dictionary api failed', async () => {
    const project = testSubqueryProject();
    project.network.dictionary =
      'https://api.subquery.network/sq/jiqiang90/not-exist';
    const dictionaryService = new DictionaryService(project);
    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const indexFilters = {
      existBlockHandler: false,
      existEventHandler: true,
      existExtrinsicHandler: true,
      eventFilters: [
        { module: 'staking', method: 'Bonded' },
        { module: 'balances', method: 'Reward' },
        { module: 'balances', method: 'Slash' },
      ],
      extrinsicFilters: [{ module: 'staking', method: 'bond' }],
    };
    const dic = await dictionaryService.getDictionary(
      startBlock,
      endBlock,
      batchSize,
      indexFilters,
    );
    expect(dic).toBeUndefined();
  }, 500000);

  it('should return meta even startblock height greater than dictionary last processed height', async () => {
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);
    const batchSize = 30;
    const startBlock = 400000000;
    const endBlock = 400010000;
    const indexFilters = {
      existBlockHandler: false,
      existEventHandler: true,
      existExtrinsicHandler: true,
      eventFilters: [
        { module: 'staking', method: 'Bonded' },
        { module: 'balances', method: 'Reward' },
        { module: 'balances', method: 'Slash' },
      ],
      extrinsicFilters: [{ module: 'staking', method: 'bond' }],
    };
    const dic = await dictionaryService.getDictionary(
      startBlock,
      endBlock,
      batchSize,
      indexFilters,
    );
    expect(dic._metadata).toBeDefined();
  }, 500000);

  it('test query the correct range', async () => {
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const indexFilters = {
      existBlockHandler: false,
      existEventHandler: true,
      existExtrinsicHandler: true,
      eventFilters: [],
      extrinsicFilters: [{ module: 'timestamp', method: 'set' }],
    };
    const dic = await dictionaryService.getDictionary(
      startBlock,
      endBlock,
      batchSize,
      indexFilters,
    );
    expect(dic.batchBlocks).toEqual(range(startBlock, startBlock + batchSize));
  }, 500000);
});
