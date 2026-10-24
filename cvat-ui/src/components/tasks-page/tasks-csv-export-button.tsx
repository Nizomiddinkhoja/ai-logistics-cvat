// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { TasksQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { getCore, Task } from 'cvat-core-wrapper';
import { t } from 'i18n';
import createCSVExportButton from '../export-csv-button-hoc';

const cvat = getCore();

const columns: CSVColumn<Task>[] = [
    { header: t('ID'), accessor: (task) => task.id },
    { header: t('Name'), accessor: (task) => task.name },
    { header: t('Task URL'), accessor: (task) => `${window.location.origin}/tasks/${task.id}` },
    { header: t('Project ID'), accessor: (task) => task.projectId },
    { header: t('Project Name'), accessor: (task) => task.projectName ?? '' },
    { header: t('Project URL'), accessor: (task) => (task.projectId ? `${window.location.origin}/projects/${task.projectId}` : '') },
    { header: t('Owner'), accessor: (task) => task.owner?.username ?? '' },
    { header: t('Assignee'), accessor: (task) => task.assignee?.username ?? '' },
    { header: t('Status'), accessor: (task) => task.status },
    { header: t('Mode'), accessor: (task) => task.mode },
    { header: t('Size'), accessor: (task) => task.size },
    { header: t('Subset'), accessor: (task) => task.subset ?? '' },
    {
        header: t('Created Date'),
        accessor: (task) => task.createdDate,
    },
    {
        header: t('Updated Date'),
        accessor: (task) => task.updatedDate,
    },
    { header: t('Bug Tracker'), accessor: (task) => task.bugTracker ?? '' },
];

const TasksCSVExportButton = createCSVExportButton<Task, TasksQuery>({
    resourceName: 'tasks',
    className: 'cvat-tasks-export-csv-button',
    tooltipTitle: t('Export tasks to CSV'),
    columns,
    uniqueKey: 'id',
    fetchPage: async (query) => {
        const tasks = await cvat.tasks.get(query);
        return {
            results: tasks,
            count: tasks.count,
        };
    },
});

export default TasksCSVExportButton;
