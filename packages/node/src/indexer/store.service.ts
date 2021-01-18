// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { Entity, Store } from '@subql/types';
import { ModelAttributes, Sequelize } from 'sequelize';

@Injectable()
export class StoreService {
  constructor(private sequelize: Sequelize) {}

  async syncSchema(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    models: { name: string; attributes: ModelAttributes<any> }[],
    schema: string,
  ): Promise<void> {
    for (const { attributes, name } of models) {
      this.sequelize.define(name, attributes, {
        // timestamps: false,
        underscored: true,
        freezeTableName: true,
        schema,
      });
    }
    await this.sequelize.sync();
  }

  getStore(): Store {
    return {
      get: async (entity: string, id: string): Promise<Entity | null> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        const record = await model.findOne({
          where: { id },
        });
        return record?.toJSON() as Entity;
      },
      set: async (entity: string, id: string, data: Entity): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.upsert(data);
      },
      remove: async (entity: string, id: string): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.destroy({ where: { id } });
      },
    };
  }
}
