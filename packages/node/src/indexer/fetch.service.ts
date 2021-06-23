// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';
import { SubqlKind } from '@subql/common';
import { isUndefined, range } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockedQueue } from './BlockedQueue';
import { Dictionary, DictionaryService } from './dictionary.service';
import { IndexerEvent } from './events';
import { BlockContent, ProjectIndexFilters } from './types';

const logger = getLogger('fetch');
const FINALIZED_BLOCK_TIME_VARIANCE = 5;

@Injectable()
export class FetchService implements OnApplicationShutdown {
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestBufferedHeight: number;
  private blockBuffer: BlockedQueue<BlockContent>;
  private nextBlockBuffer: BlockedQueue<number>;
  private isShutdown = false;
  private parentSpecVersion: number;
  private useDictionary: boolean;
  private projectIndexFilters: ProjectIndexFilters;
  private bufferAllowSize: number;

  constructor(
    private apiService: ApiService,
    protected nodeConfig: NodeConfig,
    protected project: SubqueryProject,
    private dictionaryService: DictionaryService,
    private eventEmitter: EventEmitter2,
  ) {
    this.blockBuffer = new BlockedQueue<BlockContent>(
      this.nodeConfig.batchSize * 3,
    );
    this.nextBlockBuffer = new BlockedQueue<number>(
      this.nodeConfig.batchSize * 3,
    );
    this.bufferAllowSize = this.nodeConfig.batchSize * 2;
    this.projectIndexFilters = this.getIndexFilters();
    this.useDictionary = this.isUseDictionary();
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  getIndexFilters(): ProjectIndexFilters {
    const dataSources = this.project.dataSources.filter(
      (ds) =>
        !ds.filter?.specName ||
        ds.filter.specName === this.api.runtimeVersion.specName.toString(),
    );
    const response: ProjectIndexFilters = {
      existBlockHandler: false,
      existEventHandler: false,
      existExtrinsicHandler: false,
      eventFilters: [],
      extrinsicFilters: [],
    };
    for (const ds of dataSources) {
      if (ds.kind === SubqlKind.Runtime) {
        for (const handler of ds.mapping.handlers) {
          switch (handler.kind) {
            case SubqlKind.BlockHandler:
              response.existBlockHandler = true;
              break;
            case SubqlKind.CallHandler: {
              response.existExtrinsicHandler = true;
              if (
                response.extrinsicFilters.findIndex(
                  (extrinsic) =>
                    extrinsic.module === handler.filter.module &&
                    extrinsic.method === handler.filter.method,
                ) <= -1
              ) {
                response.extrinsicFilters.push(handler.filter);
              }
              break;
            }
            case SubqlKind.EventHandler: {
              response.existEventHandler = true;
              if (
                response.eventFilters.findIndex(
                  (event) =>
                    event.module === handler.filter.module &&
                    event.method === handler.filter.method,
                ) <= -1
              ) {
                response.eventFilters.push(handler.filter);
              }
              break;
            }
            default:
          }
        }
      }
    }
    return response;
  }

  register(next: (value: BlockContent) => Promise<void>): () => void {
    let stopper = false;
    void (async () => {
      while (!stopper) {
        const block = await this.blockBuffer.take();
        this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
          value: this.blockBuffer.size,
        });
        let success = false;
        while (!success) {
          try {
            await next(block);
            success = true;
          } catch (e) {
            logger.error(
              e,
              `failed to index block at height ${block.block.block.header.number.toString()} ${
                e.handler ? `${e.handler}(${e.handlerArgs ?? ''})` : ''
              }`,
            );
            await delay(5);
          }
        }
      }
    })();
    return () => (stopper = true);
  }

  async init(): Promise<void> {
    await this.getFinalizedBlockHead();
  }
  @Interval(FINALIZED_BLOCK_TIME_VARIANCE * 1000)
  async getFinalizedBlockHead() {
    if (!this.api) {
      logger.debug(`Skip fetch finalized block until API is ready`);
      return;
    }
    try {
      const finalizedHead = await this.api.rpc.chain.getFinalizedHead();
      const finalizedBlock = await this.api.rpc.chain.getBlock(finalizedHead);
      const currentFinalizedHeight = finalizedBlock.block.header.number.toNumber();
      if (this.latestFinalizedHeight !== currentFinalizedHeight) {
        this.latestFinalizedHeight = currentFinalizedHeight;
        this.eventEmitter.emit(IndexerEvent.BlockTarget, {
          height: this.latestFinalizedHeight,
        });
      }
    } catch (e) {
      logger.error(e, `Having a problem when get finalized block`);
    }
  }

  latestProcessed(height: number): void {
    this.latestProcessedHeight = height;
  }
  async startLoop(initBlockHeight: number): Promise<void> {
    await Promise.all([
      this.fillNextBlockBuffer(initBlockHeight),
      this.fillBlockBuffer(),
    ]);
  }

  async fillNextBlockBuffer(initBlockHeight: number): Promise<void> {
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight - 1;
    }
    await this.fetchMeta(initBlockHeight);
    // eslint-disable-next-line no-constant-condition
    let startBlockHeight = initBlockHeight;

    while (!this.isShutdown) {
      if (
        this.nextBlockBuffer.size >= this.bufferAllowSize ||
        startBlockHeight > this.latestFinalizedHeight
      ) {
        await delay(1);
        continue;
      }
      if (this.useDictionary) {
        try {
          const dictionary = await this.dictionaryService.getDictionary(
            startBlockHeight,
            this.nodeConfig.batchSize,
            this.projectIndexFilters,
          );
          //TODO
          // const specVersionMap = dictionary.specVersions;
          if (
            dictionary &&
            this.dictionaryValidation(dictionary, startBlockHeight)
          ) {
            const { batchBlocks } = dictionary;
            if (batchBlocks.length === 0) {
              this.latestBufferedHeight =
                dictionary._metadata.lastProcessedHeight;
            } else {
              this.nextBlockBuffer.putAll(batchBlocks);
              this.latestBufferedHeight = batchBlocks[batchBlocks.length - 1];
              startBlockHeight = this.latestBufferedHeight + 1;
              this.eventEmitter.emit(IndexerEvent.NextBlockQueueSize, {
                value: this.nextBlockBuffer.size,
              });
            }
            continue; // skip nextBlockRange() way
          }
          // else use this.nextBlockRange()
        } catch (e) {
          logger.debug(`Fetch dictionary stopped: ${e.message}`);
        }
      }
      // the original method: fill next batch size of blocks
      const endHeight = this.nextEndBlockHeight(startBlockHeight);
      this.nextBlockBuffer.putAll(range(startBlockHeight, endHeight));
      this.latestBufferedHeight = endHeight;
      startBlockHeight = this.latestBufferedHeight + 1;
      this.eventEmitter.emit(IndexerEvent.NextBlockQueueSize, {
        value: this.nextBlockBuffer.size,
      });
    }
  }

  async fillBlockBuffer(): Promise<void> {
    while (!this.isShutdown) {
      if (this.nextBlockBuffer.size === 0) {
        await delay(1);
        continue;
      }
      const bufferBlocks = await this.nextBlockBuffer.takeAll(
        this.nodeConfig.batchSize,
      );
      const metadataChanged = await this.fetchMeta(
        bufferBlocks[bufferBlocks.length - 1],
      );
      const blocks = await SubstrateUtil.fetchBlocksBatches(
        this.api,
        bufferBlocks,
        metadataChanged ? undefined : this.parentSpecVersion,
      );
      logger.info(
        `fetch block [${bufferBlocks[0]},${
          bufferBlocks[bufferBlocks.length - 1]
        }]`,
      );
      for (const block of blocks) {
        this.blockBuffer.put(block);
      }
      this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
        value: this.blockBuffer.size,
      });
    }
  }

  async fetchMeta(height: number): Promise<boolean> {
    const parentBlockHash = await this.api.rpc.chain.getBlockHash(
      Math.max(height - 1, 0),
    );
    const runtimeVersion = await this.api.rpc.state.getRuntimeVersion(
      parentBlockHash,
    );
    const specVersion = runtimeVersion.specVersion.toNumber();
    if (this.parentSpecVersion !== specVersion) {
      const blockHash = await this.api.rpc.chain.getBlockHash(height);
      await SubstrateUtil.prefetchMetadata(this.api, blockHash);
      this.parentSpecVersion = specVersion;
      return true;
    }
    return false;
  }

  private nextEndBlockHeight(startBlockHeight: number): number {
    let endBlockHeight = startBlockHeight + this.nodeConfig.batchSize - 1;
    if (endBlockHeight > this.latestFinalizedHeight) {
      endBlockHeight = this.latestFinalizedHeight;
    }
    return endBlockHeight;
  }

  private isUseDictionary(): boolean {
    if (!this.project.network.dictionary) {
      return false;
    } else if (this.projectIndexFilters.existBlockHandler) {
      return false;
    } else if (
      (this.projectIndexFilters.existEventHandler &&
        this.projectIndexFilters.eventFilters.length !== 0) ||
      (this.projectIndexFilters.existExtrinsicHandler &&
        this.projectIndexFilters.extrinsicFilters.length !== 0)
    ) {
      return true;
    }
  }

  private dictionaryValidation(
    { _metadata: metaData }: Dictionary,
    startBlockHeight: number,
  ): boolean {
    if (
      metaData.chain !== this.api.runtimeChain.toString() ||
      metaData.specName !== this.api.runtimeVersion.specName.toString() ||
      metaData.genesisHash !== this.api.genesisHash.toString()
    ) {
      logger.warn(`Dictionary is disabled since now`);
      this.useDictionary = false;
      return false;
    }
    if (metaData.lastProcessedHeight < startBlockHeight) {
      logger.warn(
        `Dictionary indexed block is behind current indexing block height`,
      );
      return false;
    }
    return true;
  }
}
