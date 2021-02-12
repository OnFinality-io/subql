// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { isUndefined } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockedQueue } from './BlockedQueue';
import { BlockContent } from './types';

const logger = getLogger('fetch');

@Injectable()
export class FetchService
  implements OnApplicationBootstrap, OnApplicationShutdown {
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestPreparedHeight: number;
  private blockBuffer: BlockedQueue<BlockContent>;
  private isShutdown = false;
  private specVersion: number;

  constructor(
    private apiService: ApiService,
    protected nodeConfig: NodeConfig,
  ) {
    this.blockBuffer = new BlockedQueue<BlockContent>(
      this.nodeConfig.batchSize * 3,
    );
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  register(next: (value: BlockContent) => Promise<void>) {
    let stopper = false;
    void (async () => {
      while (!stopper) {
        const block = await this.blockBuffer.take();
        await next(block);
      }
    })();
    return () => (stopper = true);
  }

  async onApplicationBootstrap(): Promise<void> {
    const subscribeHeads = () =>
      this.api.rpc.chain.subscribeFinalizedHeads((head) => {
        this.latestFinalizedHeight = head.number.toNumber();
      });
    this.api.on('connected', subscribeHeads);
    await subscribeHeads();
  }

  latestProcessed(height: number): void {
    this.latestProcessedHeight = height;
  }

  async startLoop(initBlockHeight: number): Promise<void> {
    const preloadBlocks = this.nodeConfig.batchSize * 2;
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight - 1;
    }
    await this.fetchMeta(initBlockHeight);
    // eslint-disable-next-line no-constant-condition
    while (!this.isShutdown) {
      const [startBlockHeight, endBlockHeight] =
        this.nextBlockRange(initBlockHeight) ?? [];
      if (isUndefined(startBlockHeight)) {
        await delay(1);
        continue;
      }
      logger.info(
        `fetch block [${startBlockHeight}, ${endBlockHeight}]`,
      );
      await this.fetchMeta(endBlockHeight);
      const blocks = await (this.nodeConfig.preferRange
        ? SubstrateUtil.fetchBlocksViaRangeQuery(
            this.api,
            startBlockHeight,
            endBlockHeight,
          )
        : SubstrateUtil.fetchBlocks(
            this.api,
            startBlockHeight,
            endBlockHeight,
          ));
      for (const block of blocks) {
        this.blockBuffer.put(block);
      }
      this.latestPreparedHeight = endBlockHeight;
    }
  }

  async fetchMeta(height: number): Promise<void> {
    const blockHash = await this.api.rpc.chain.getBlockHash(height);
    const { specVersion } = await this.api.rpc.state.getRuntimeVersion(
      blockHash,
    );
    if (this.specVersion !== specVersion.toNumber()) {
      this.specVersion = specVersion.toNumber();
      await SubstrateUtil.prefetchMetadata(this.api, height);
    }
  }

  private nextBlockRange(
    initBlockHeight: number,
  ): [number, number] | undefined {
    const preloadBlocks = this.nodeConfig.batchSize * 2;
    let startBlockHeight: number;
    if (this.latestPreparedHeight === undefined) {
      startBlockHeight = initBlockHeight;
    } else if (
      this.latestPreparedHeight - this.latestProcessedHeight <
      preloadBlocks
    ) {
      startBlockHeight = this.latestPreparedHeight + 1;
    } else {
      return;
    }
    if (startBlockHeight > this.latestFinalizedHeight) {
      return;
    }
    let endBlockHeight = startBlockHeight + this.nodeConfig.batchSize - 1;
    if (endBlockHeight > this.latestFinalizedHeight) {
      endBlockHeight = this.latestFinalizedHeight;
    }
    return [startBlockHeight, endBlockHeight];
  }
}
