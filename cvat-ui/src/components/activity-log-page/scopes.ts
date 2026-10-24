// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { t } from 'i18n';

// events written very often by the app itself, they hide the actions of users
export const TECHNICAL_SCOPES = [
    'read:cache_item',
    'create:cache_item',
    'send:working_time',
    'debug:info',
    'zoom:image',
    'fit:image',
    'rotate:image',
    'change:frame',
    'click:element',
    'load:cvat',
    'load:workspace',
];

const SCOPE_LABELS: Record<string, () => string> = {
    'create:project': () => t('Created a project'),
    'update:project': () => t('Updated a project'),
    'delete:project': () => t('Deleted a project'),
    'create:task': () => t('Created a task'),
    'update:task': () => t('Updated a task'),
    'delete:task': () => t('Deleted a task'),
    'create:job': () => t('Created a job'),
    'update:job': () => t('Updated a job'),
    'delete:job': () => t('Deleted a job'),
    'create:label': () => t('Created a label'),
    'update:label': () => t('Updated a label'),
    'delete:label': () => t('Deleted a label'),
    'create:shapes': () => t('Created shapes'),
    'update:shapes': () => t('Updated shapes'),
    'delete:shapes': () => t('Deleted shapes'),
    'create:tags': () => t('Created tags'),
    'update:tags': () => t('Updated tags'),
    'delete:tags': () => t('Deleted tags'),
    'create:tracks': () => t('Created tracks'),
    'update:tracks': () => t('Updated tracks'),
    'delete:tracks': () => t('Deleted tracks'),
    'create:user': () => t('Created a user'),
    'update:user': () => t('Updated a user'),
    'delete:user': () => t('Deleted a user'),
    'create:organization': () => t('Created an organization'),
    'update:organization': () => t('Updated an organization'),
    'delete:organization': () => t('Deleted an organization'),
    'create:membership': () => t('Added a member'),
    'update:membership': () => t('Updated a member'),
    'delete:membership': () => t('Removed a member'),
    'create:invitation': () => t('Sent an invitation'),
    'delete:invitation': () => t('Deleted an invitation'),
    'create:comment': () => t('Created a comment'),
    'update:comment': () => t('Updated a comment'),
    'delete:comment': () => t('Deleted a comment'),
    'create:issue': () => t('Created an issue'),
    'update:issue': () => t('Updated an issue'),
    'delete:issue': () => t('Deleted an issue'),
    'create:webhook': () => t('Created a webhook'),
    'update:webhook': () => t('Updated a webhook'),
    'delete:webhook': () => t('Deleted a webhook'),
    'import:dataset': () => t('Imported a dataset'),
    'export:dataset': () => t('Exported a dataset'),
    'import:annotations': () => t('Imported annotations'),
    'export:annotations': () => t('Exported annotations'),
    'import:backup': () => t('Imported a backup'),
    'export:backup': () => t('Exported a backup'),
    'call:function': () => t('Ran an auto annotation model'),
    'draw:object': () => t('Drew an object'),
    'resize:object': () => t('Resized an object'),
    'drag:object': () => t('Moved an object'),
    'delete:object': () => t('Deleted an object'),
    'copy:object': () => t('Copied an object'),
    'paste:object': () => t('Pasted an object'),
    'merge:objects': () => t('Merged objects'),
    'split:objects': () => t('Split objects'),
    'group:objects': () => t('Grouped objects'),
    'save:job': () => t('Saved a job'),
    'load:job': () => t('Opened a job'),
    'action:undo': () => t('Undo'),
    'action:redo': () => t('Redo'),
    'send:exception': () => t('Error'),
    'send:working_time': () => t('Working time'),
    'read:cache_item': () => t('Read from cache'),
    'create:cache_item': () => t('Wrote to cache'),
    'debug:info': () => t('Debug information'),
    'zoom:image': () => t('Zoomed the image'),
    'fit:image': () => t('Fit the image'),
    'rotate:image': () => t('Rotated the image'),
    'change:frame': () => t('Changed the frame'),
    'click:element': () => t('Clicked an element'),
    'load:cvat': () => t('Opened CVAT'),
    'load:workspace': () => t('Opened a workspace'),
};

export function scopeLabel(scope: string): string {
    return SCOPE_LABELS[scope]?.() ?? scope;
}

export function scopeColor(scope: string): string | undefined {
    const [verb] = scope.split(':');
    if (scope === 'send:exception') return 'red';
    if (['create', 'draw', 'paste', 'import'].includes(verb)) return 'green';
    if (['update', 'resize', 'drag', 'save', 'merge', 'split', 'group'].includes(verb)) return 'blue';
    if (verb === 'delete') return 'volcano';
    if (['export', 'call'].includes(verb)) return 'purple';
    return undefined;
}
