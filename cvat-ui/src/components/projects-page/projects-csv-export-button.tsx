// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ProjectsQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { getCore, Project } from 'cvat-core-wrapper';
import { t } from 'i18n';
import createCSVExportButton from '../export-csv-button-hoc';

const cvat = getCore();

const columns: CSVColumn<Project>[] = [
    { header: t('ID'), accessor: (project) => project.id },
    { header: t('Name'), accessor: (project) => project.name },
    { header: t('Project URL'), accessor: (project) => `${window.location.origin}/projects/${project.id}` },
    { header: t('Owner'), accessor: (project) => project.owner?.username ?? '' },
    { header: t('Assignee'), accessor: (project) => project.assignee?.username ?? '' },
    { header: t('Status'), accessor: (project) => project.status },
    { header: t('Dimension'), accessor: (project) => project.dimension },
    {
        header: t('Task Subsets'),
        accessor: (project) => (
            project.subsets && project.subsets.length > 0 ?
                project.subsets.join(', ') :
                ''
        ),
    },
    {
        header: t('Created Date'),
        accessor: (project) => project.createdDate,
    },
    {
        header: t('Updated Date'),
        accessor: (project) => project.updatedDate,
    },
    { header: t('Bug Tracker'), accessor: (project) => project.bugTracker ?? '' },
];

const ProjectsCSVExportButton = createCSVExportButton<Project, ProjectsQuery>({
    resourceName: 'projects',
    className: 'cvat-projects-export-csv-button',
    tooltipTitle: t('Export projects to CSV'),
    columns,
    uniqueKey: 'id',
    fetchPage: async (query) => {
        const projects = await cvat.projects.get(query);
        return {
            results: projects,
            count: projects.count,
        };
    },
});

export default ProjectsCSVExportButton;
