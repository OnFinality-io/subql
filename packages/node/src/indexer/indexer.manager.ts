// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { buildSchema, getAllEntities, SubqlKind } from '@subql/common';
import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import { Subject } from 'rxjs';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { objectTypeToModelAttributes } from '../utils/graphql';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { IndexerSandbox } from './sandbox';
import { StoreService } from './store.service';

const PRELOAD_BLOCKS = 10;
const DEFAULT_DB_SCHEMA = 'public';

interface BlockContent {
  block: SubstrateBlock;
  extrinsics: SubstrateExtrinsic[];
  events: SubstrateEvent[];
}

@Injectable()
export class IndexerManager implements OnApplicationBootstrap {
  private vm: IndexerSandbox;
  private api: ApiPromise;
  private latestFinalizedHeight: number;
  private lastPreparedHeight: number;
  private subqueryState: SubqueryModel;
  private block$: Subject<BlockContent> = new Subject();

  constructor(
    protected apiService: ApiService,
    protected storeService: StoreService,
    protected sequelize: Sequelize,
    protected project: SubqueryProject,
    protected nodeConfig: NodeConfig,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
  ) {}

  async indexBlock({ block, events, extrinsics }: BlockContent): Promise<void> {
    try {
      for (const ds of this.project.dataSources) {
        if (ds.startBlock > block.block.header.number.toNumber()) {
          continue;
        }
        if (ds.kind === SubqlKind.Runtime) {
          for (const handler of ds.mapping.handlers) {
            if (handler.kind === SubqlKind.BlockHandler) {
              await this.vm.securedExec(handler.handler, [block]);
            }
            if (handler.kind === SubqlKind.CallHandler) {
              const filteredExtrinsics = SubstrateUtil.filterExtrinsics(
                extrinsics,
                handler.filter,
              );
              await Promise.all(
                filteredExtrinsics.map(async (e) =>
                  this.vm.securedExec(handler.handler, [e]),
                ),
              );
            }
            if (handler.kind === SubqlKind.EventHandler) {
              const filteredEvents = SubstrateUtil.filterEvents(
                events,
                handler.filter,
              );
              await Promise.all(
                filteredEvents.map(async (e) =>
                  this.vm.securedExec(handler.handler, [e]),
                ),
              );
            }
          }
        }
        // TODO: support Ink! and EVM
      }
      this.subqueryState.nextBlockHeight = block.block.header.number.toNumber();
      await this.subqueryState.save();
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    this.api = await this.apiService.getApi();
    this.subqueryState = await this.ensureProject(this.nodeConfig.subqueryName);
    await this.initDbSchema();
    await this.api.rpc.chain.subscribeFinalizedHeads((head) => {
      this.latestFinalizedHeight = head.number.toNumber();
    });
    this.initVM();
    void this.prepareBlock().catch((err) => {
      console.error('prepare block fails', err);
      // FIXME: retry before exit
      process.exit(1);
    });
    this.block$.subscribe(this.indexBlock.bind(this));
  }

  private async prepareBlock() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let blockHeight: number;
      if (!this.lastPreparedHeight) {
        blockHeight = this.subqueryState.nextBlockHeight;
      } else if (
        this.lastPreparedHeight - this.subqueryState.nextBlockHeight + 1 <
        PRELOAD_BLOCKS
      ) {
        blockHeight = this.lastPreparedHeight + 1;
      } else {
        await delay(1);
        continue;
      }
      if (blockHeight > this.latestFinalizedHeight) {
        await delay(1);
        continue;
      }
      console.log('fetch block ', blockHeight);
      const blockHash = await this.api.rpc.chain.getBlockHash(blockHeight);
      const [block, events] = await Promise.all([
        this.api.rpc.chain.getBlock(blockHash),
        this.api.query.system.events.at(blockHash),
      ]);
      const wrappedBlock = SubstrateUtil.wrapBlock(block);
      const wrappedExtrinsics = SubstrateUtil.wrapExtrinsics(
        wrappedBlock,
        events,
      );
      const wrappedEvents = SubstrateUtil.wrapEvents(wrappedExtrinsics, events);
      this.block$.next({
        block: wrappedBlock,
        extrinsics: wrappedExtrinsics,
        events: wrappedEvents,
      });
      this.lastPreparedHeight = blockHeight;
    }
  }

  private initVM(): void {
    this.vm = new IndexerSandbox({
      store: this.storeService.getStore(),
      api: this.api,
      root: this.project.path,
    });

    this.vm.on('console.log', (data) => console.log(`[VM Sandbox]: ${data}`));
  }

  private async ensureProject(name: string): Promise<SubqueryModel> {
    let project = await this.subqueryRepo.findOne({
      where: { name: this.nodeConfig.subqueryName },
    });
    if (!project) {
      let projectSchema: string;
      if (this.nodeConfig.localMode) {
        // create tables in default schema if local mode is enabled
        projectSchema = DEFAULT_DB_SCHEMA;
      } else {
        const suffix = await this.nextSubquerySchemaSuffix();
        projectSchema = `subquery_${suffix}`;
        const schemas = await this.sequelize.showAllSchemas(undefined);
        if (!((schemas as unknown) as string[]).includes(projectSchema)) {
          await this.sequelize.createSchema(projectSchema, undefined);
        }
      }

      project = await this.subqueryRepo.create({
        name,
        dbSchema: projectSchema,
        hash: '0x',
        nextBlockHeight: Math.min(
          ...this.project.dataSources.map((item) => item.startBlock),
        ),
      });
    }
    return project;
  }

  private async initDbSchema(): Promise<void> {
    const schema = this.subqueryState.dbSchema;
    const graphqlSchema = buildSchema(
      path.join(this.project.path, this.project.schema),
    );
    const models = getAllEntities(graphqlSchema).map((entity) => {
      const modelAttributes = objectTypeToModelAttributes(entity);
      return { name: entity.name, attributes: modelAttributes };
    });
    await this.storeService.syncSchema(models, schema);
  }

  private async nextSubquerySchemaSuffix(): Promise<number> {
    const seqExists = await this.sequelize.query(
      `SELECT 1
       FROM information_schema.sequences
       where sequence_schema = 'public'
         and sequence_name = 'subquery_schema_seq'`,
      {
        type: QueryTypes.SELECT,
      },
    );
    if (!seqExists.length) {
      await this.sequelize.query(
        `CREATE SEQUENCE subquery_schema_seq as integer START 1;`,
        { type: QueryTypes.RAW },
      );
    }
    const [{ nextval }] = await this.sequelize.query(
      `SELECT nextval('subquery_schema_seq')`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return Number(nextval);
  }
}
