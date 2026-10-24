// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { JobsQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { getCore, Job } from 'cvat-core-wrapper';
import { t } from 'i18n';
import createCSVExportButton from '../export-csv-button-hoc';

const cvat = getCore();

const columns: CSVColumn<Job>[] = [
    { header: t('ID'), accessor: (job) => job.id },
    { header: t('Job URL'), accessor: (job) => `${window.location.origin}/tasks/${job.taskId}/jobs/${job.id}` },
    { header: t('Task ID'), accessor: (job) => job.taskId },
    { header: t('Task Name'), accessor: (job) => job.taskName ?? '' },
    { header: t('Task URL'), accessor: (job) => `${window.location.origin}/tasks/${job.taskId}` },
    { header: t('Project ID'), accessor: (job) => job.projectId },
    { header: t('Project Name'), accessor: (job) => job.projectName ?? '' },
    { header: t('Project URL'), accessor: (job) => (job.projectId ? `${window.location.origin}/projects/${job.projectId}` : '') },
    { header: t('Assignee'), accessor: (job) => job.assignee?.username ?? '' },
    { header: t('Stage'), accessor: (job) => job.stage },
    { header: t('State'), accessor: (job) => job.state },
    { header: t('Type'), accessor: (job) => job.type },
    { header: t('Start Frame'), accessor: (job) => job.startFrame },
    { header: t('Stop Frame'), accessor: (job) => job.stopFrame },
    { header: t('Frame Count'), accessor: (job) => job.stopFrame - job.startFrame + 1 },
    {
        header: t('Created Date'),
        accessor: (job) => job.createdDate,
    },
    {
        header: t('Updated Date'),
        accessor: (job) => job.updatedDate,
    },
];

const JobsCSVExportButton = createCSVExportButton<Job, JobsQuery>({
    resourceName: 'jobs',
    className: 'cvat-jobs-export-csv-button',
    tooltipTitle: t('Export jobs to CSV'),
    columns,
    uniqueKey: 'id',
    fetchPage: async (query) => {
        const jobs = await cvat.jobs.get(query);
        return {
            results: jobs,
            count: jobs.count,
        };
    },
});

export default JobsCSVExportButton;
