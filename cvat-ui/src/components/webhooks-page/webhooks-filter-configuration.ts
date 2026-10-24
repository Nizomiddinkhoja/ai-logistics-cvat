// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';
import { t } from 'i18n';

export const config: Partial<Config> = {
    fields: {
        description: {
            label: t('Description'),
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        target_url: {
            label: t('Target URL'),
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        owner: {
            label: t('Owner'),
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        updated_date: {
            label: t('Last updated'),
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
        type: {
            label: t('Type'),
            type: 'select',
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'organization', title: t('Organization') },
                    { value: 'project', title: t('Project') },
                ],
            },
        },
        id: {
            label: t('ID'),
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedWebhooksFilters';
export const predefinedFilterValues = {};
