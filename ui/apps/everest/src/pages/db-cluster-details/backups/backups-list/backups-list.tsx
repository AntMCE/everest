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

import { Delete } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { MenuItem } from '@mui/material';
import { MenuButton, Table } from '@percona/ui-lib';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { StatusField } from 'components/status-field/status-field';
import { DATE_FORMAT } from 'consts';
import { format } from 'date-fns';
import {
  BACKUPS_QUERY_KEY,
  useDbBackups,
  useDeleteBackup,
} from 'hooks/api/backups/useBackups';
import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import { MRT_ColumnDef } from 'material-react-table';
import { RestoreDbModal } from 'modals/index.ts';
import { useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Backup, BackupStatus } from 'shared-types/backups.types';
import { DbClusterStatus } from 'shared-types/dbCluster.types.ts';
import { ScheduleModalContext } from '../backups.context.ts';
import { BACKUP_STATUS_TO_BASE_STATUS } from './backups-list.constants';
import { Messages } from './backups-list.messages';
import { OnDemandBackupModal } from './on-demand-backup-modal/on-demand-backup-modal';

export const BackupsList = () => {
  const queryClient = useQueryClient();
  const { dbClusterName, namespace = '' } = useParams();
  const [openRestoreDbModal, setOpenRestoreDbModal] = useState(false);
  const [isNewClusterMode, setIsNewClusterMode] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [openCreateBackupModal, setOpenCreateBackupModal] = useState(false);

  const { data: backups = [] } = useDbBackups(dbClusterName!, namespace, {
    enabled: !!dbClusterName,
    refetchInterval: 10 * 1000,
  });
  const { mutate: deleteBackup, isPending: deletingBackup } =
    useDeleteBackup(namespace);
  const { data: dbCluster } = useDbCluster(dbClusterName || '', namespace, {
    enabled: !!dbClusterName,
  });

  const { setMode: setScheduleModalMode, setOpenScheduleModal } =
    useContext(ScheduleModalContext);

  const restoring = dbCluster?.status?.status === DbClusterStatus.restoring;

  const columns = useMemo<MRT_ColumnDef<Backup>[]>(
    () => [
      {
        accessorKey: 'state',
        header: 'Status',
        filterVariant: 'multi-select',
        filterSelectOptions: Object.values(BackupStatus),
        Cell: ({ cell }) => (
          <StatusField
            status={cell.getValue<BackupStatus>()}
            statusMap={BACKUP_STATUS_TO_BASE_STATUS}
          >
            {/* @ts-ignore */}
            {cell.getValue()}
          </StatusField>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'created',
        header: 'Started',
        enableColumnFilter: false,
        sortingFn: 'datetime',
        Cell: ({ cell }) =>
          cell.getValue<Date>()
            ? format(cell.getValue<Date>(), DATE_FORMAT)
            : '',
      },
      {
        accessorKey: 'completed',
        header: 'Finished',
        enableColumnFilter: false,
        sortingFn: 'datetime',
        Cell: ({ cell }) =>
          cell.getValue<Date>()
            ? format(cell.getValue<Date>(), DATE_FORMAT)
            : '',
      },
    ],
    []
  );

  const handleDeleteBackup = (backupName: string) => {
    setSelectedBackup(backupName);
    setOpenDeleteDialog(true);
  };

  const handleManualBackup = (handleClose: () => void) => {
    setOpenCreateBackupModal(true);
    handleClose();
  };
  const handleScheduledBackup = (handleClose: () => void) => {
    setScheduleModalMode && setScheduleModalMode('new');
    setOpenScheduleModal && setOpenScheduleModal(true);
    handleClose();
  };

  const handleCloseBackupModal = () => {
    setOpenCreateBackupModal(false);
  };
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = (backupName: string) => {
    deleteBackup(backupName, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [BACKUPS_QUERY_KEY, dbClusterName],
        });
        handleCloseDeleteDialog();
      },
    });
  };

  const handleRestoreBackup = (backupName: string) => {
    setSelectedBackup(backupName);
    setIsNewClusterMode(false);
    setOpenRestoreDbModal(true);
  };

  const handleRestoreToNewDbBackup = (backupName: string) => {
    setSelectedBackup(backupName);
    setOpenRestoreDbModal(true);
    setIsNewClusterMode(true);
  };

  return (
    <>
      <Table
        tableName="backupList"
        noDataMessage={Messages.noData}
        data={backups}
        columns={columns}
        initialState={{
          sorting: [
            {
              id: 'created',
              desc: true,
            },
          ],
        }}
        renderTopToolbarCustomActions={() => (
          <MenuButton
            buttonText={Messages.createBackup}
            buttonProps={{ disabled: restoring }}
          >
            {/* MUI Menu does not like fragments and asks for arrays instead */}
            {(handleClose) => [
              <MenuItem
                key="now"
                onClick={() => handleManualBackup(handleClose)}
                data-testid="now-menu-item"
              >
                {Messages.now}
              </MenuItem>,
              <MenuItem
                onClick={() => handleScheduledBackup(handleClose)}
                key="schedule"
                data-testid="schedule-menu-item"
              >
                {Messages.schedule}
              </MenuItem>,
            ]}
          </MenuButton>
        )}
        enableRowActions
        renderRowActionMenuItems={({ row, closeMenu }) => [
          <MenuItem
            key={0}
            disabled={row.original.state !== BackupStatus.OK || restoring}
            onClick={() => {
              handleRestoreBackup(row.original.name);
              closeMenu();
            }}
            sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
          >
            <RestartAltIcon />
            {Messages.restore}
          </MenuItem>,
          <MenuItem
            key={1}
            disabled={row.original.state !== BackupStatus.OK || restoring}
            onClick={() => {
              handleRestoreToNewDbBackup(row.original.name);
              closeMenu();
            }}
            sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
          >
            <AddIcon />
            {Messages.restoreToNewDb}
          </MenuItem>,
          <MenuItem
            key={2}
            onClick={() => {
              handleDeleteBackup(row.original.name);
              closeMenu();
            }}
            sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
          >
            <Delete />
            {Messages.delete}
          </MenuItem>,
        ]}
      />
      <OnDemandBackupModal
        open={openCreateBackupModal}
        handleClose={handleCloseBackupModal}
      />
      {openDeleteDialog && (
        <ConfirmDialog
          isOpen={openDeleteDialog}
          selectedId={selectedBackup}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialog.header}
          handleConfirm={handleConfirmDelete}
          disabledButtons={deletingBackup}
        >
          {Messages.deleteDialog.content(selectedBackup)}
        </ConfirmDialog>
      )}
      {openRestoreDbModal && dbCluster && (
        <RestoreDbModal
          dbCluster={dbCluster}
          namespace={namespace}
          isNewClusterMode={isNewClusterMode}
          isOpen={openRestoreDbModal}
          closeModal={() => setOpenRestoreDbModal(false)}
          backupName={selectedBackup}
        />
      )}
    </>
  );
};
