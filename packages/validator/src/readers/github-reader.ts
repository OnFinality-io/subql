// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios, {AxiosInstance} from 'axios';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

export class GithubReader implements Reader {
  private readonly api: AxiosInstance;
  private defaultBranch: string;

  constructor(private readonly key: string) {
    this.api = axios.create({
      baseURL: `https://raw.githubusercontent.com/${key}`,
    });
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    try {
      const branch = await this.getDefaultBranch();
      const {data} = await this.api.get(`${branch}/package.json`);
      return data;
    } catch (err) {
      return undefined;
    }
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    try {
      const branch = await this.getDefaultBranch();
      const {data} = await this.api.get(`${branch}/project.yaml`);
      return yaml.load(data);
    } catch (err) {
      return undefined;
    }
  }

  private async getDefaultBranch(): Promise<string> {
    if (this.defaultBranch) {
      return this.defaultBranch;
    }
    const {data} = await axios.get(`https://api.github.com/repos/${this.key}`);
    this.defaultBranch = data.default_branch;
    return this.defaultBranch;
  }
}
