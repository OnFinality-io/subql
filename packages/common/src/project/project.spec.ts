// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {loadProjectManifest} from './load';

describe('project.yaml', () => {
  it('can parse project.yaml to ProjectManifestImpl', () => {
    loadProjectManifest(path.join(__dirname, '../../test/project.yaml'));
  });

  it('can validate project.yaml', () => {
    expect(() => loadProjectManifest(path.join(__dirname, '../../test/project_falsy.yaml'))).toThrow();
  });
});
