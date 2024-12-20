// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { expect, test } from '@playwright/test';
import { createDbClusterFn, deleteDbClusterFn } from '@e2e/utils/db-cluster';
import { findDbAndClickActions } from '@e2e/utils/db-clusters-list';
import { DbType } from '@percona/types';
import { moveForward } from '@e2e/utils/db-wizard';

test.describe('DB Cluster Editing Resources Step (Mongo)', () => {
  const mongoDBName = 'mongo-db';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: mongoDBName,
      dbType: DbType.Mongo,
      numberOfNodes: '5',
      sharding: true,
      cpu: 1,
      memory: 4,
      proxyCpu: 2,
      proxyMemory: 4,
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, mongoDBName);
  });

  test('Show the correct number of nodes during editing', async ({ page }) => {
    await findDbAndClickActions(page, mongoDBName, 'Edit');

    await expect(
      page.getByTestId('toggle-button-group-input-db-type')
    ).toBeVisible();
    // Go to Resources step
    await moveForward(page);

    await expect(page.getByTestId('toggle-button-nodes-5')).toBeVisible();
    await expect(
      page.getByTestId('node-resources-toggle-button-small')
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('proxies-accordion').click();
    await expect(
      page.getByTestId('router-resources-toggle-button-medium')
    ).toHaveAttribute('aria-pressed', 'true');
    const a = page
      .getByRole('button', { pressed: true })
      .filter({ hasText: '5 nodes' });
    expect(a).toBeTruthy();
  });

  test('Disable disk resize during edition', async ({ page }) => {
    await findDbAndClickActions(page, mongoDBName, 'Edit');
    await page.getByTestId('button-edit-preview-resources').click();
    await expect(page.getByTestId('text-input-disk')).toBeDisabled();
  });

  test('Show custom resources during editing', async ({ page, request }) => {
    const dbName = 'mongo-custom-resources';
    await createDbClusterFn(request, {
      dbName,
      dbType: DbType.Mongo,
      numberOfNodes: '5',
      sharding: true,
      cpu: 1,
      memory: 4,
      proxyCpu: 3,
      proxyMemory: 4,
    });
    await findDbAndClickActions(page, dbName, 'Edit');
    await page.getByTestId('button-edit-preview-resources').click();
    await expect(
      page.getByTestId('node-resources-toggle-button-small')
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('proxies-accordion').click();
    await expect(
      page.getByTestId('router-resources-toggle-button-custom')
    ).toHaveAttribute('aria-pressed', 'true');
    await deleteDbClusterFn(request, dbName);
  });

  test('Show predefined resources regardless of disk', async ({
    page,
    request,
  }) => {
    const dbName = 'mongo-disk-resources';
    await createDbClusterFn(request, {
      dbName,
      dbType: DbType.Mongo,
      numberOfNodes: '5',
      sharding: true,
      cpu: 1,
      memory: 4,
      disk: 1,
      proxyCpu: 2,
      proxyMemory: 4,
    });
    await findDbAndClickActions(page, dbName, 'Edit');
    await page.getByTestId('button-edit-preview-resources').click();
    await expect(
      page.getByTestId('node-resources-toggle-button-small')
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('proxies-accordion').click();
    await expect(
      page.getByTestId('router-resources-toggle-button-medium')
    ).toHaveAttribute('aria-pressed', 'true');
    await deleteDbClusterFn(request, dbName);
  });
});
