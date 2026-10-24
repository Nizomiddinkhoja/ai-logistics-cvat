// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';
import { t } from 'i18n';

export const config: Partial<Config> = {
    fields: {
        id: {
            label: t('ID'),
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        provider_type: {
            label: t('Provider type'),
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'AWS_S3_BUCKET', title: t('Amazon S3') },
                    { value: 'AZURE_CONTAINER', title: t('Azure Blob Storage') },
                    { value: 'GOOGLE_CLOUD_STORAGE', title: t('Google Cloud Storage') },
                ],
            },
        },
        credentials_type: {
            label: t('Credentials type'),
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'KEY_SECRET_KEY_PAIR', title: t('Key & secret key') },
                    { value: 'ACCOUNT_NAME_TOKEN_PAIR', title: t('Account name & token') },
                    { value: 'ANONYMOUS_ACCESS', title: t('Anonymous access') },
                    { value: 'KEY_FILE_PATH', title: t('Key file') },
                ],
            },
        },
        resource: {
            label: t('Resource name'),
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        name: {
            label: t('Name'),
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        description: {
            label: t('Description'),
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
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedCloudStoragesFilters';

export const predefinedFilterValues = {
    'Owned by me': '{"and":[{"==":[{"var":"owner"},"<username>"]}]}',
    'Amazon S3 storages': '{"and":[{"==":[{"var":"provider_type"},"AWS_S3_BUCKET"]}]}',
    'Azure Blob storages': '{"and":[{"==":[{"var":"provider_type"},"AZURE_CONTAINER"]}]}',
    'Google Cloud storages': '{"and":[{"==":[{"var":"provider_type"},"GOOGLE_CLOUD_STORAGE"]}]}',
};
