// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';
import { t } from 'i18n';

export const config: Partial<Config> = {
    fields: {
        user: {
            label: t('User'),
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        role: {
            label: t('Role'),
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'worker', title: t('Worker') },
                    { value: 'supervisor', title: t('Supervisor') },
                    { value: 'maintainer', title: t('Maintainer') },
                    { value: 'owner', title: t('Owner') },
                ],
            },
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedMembershipsFilters';
export const predefinedFilterValues = {
    Workers: '{"and":[{"==":[{"var":"role"},"worker"]}]}',
    Supervisors: '{"and":[{"==":[{"var":"role"},"supervisor"]}]}',
    Maintainers: '{"and":[{"==":[{"var":"role"},"maintainer"]}]}',
};
