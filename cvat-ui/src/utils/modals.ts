// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Modal from 'antd/lib/modal';

import { Organization, Project, Task } from 'cvat-core-wrapper';
import { t } from 'i18n';

export function confirmTransferModal(
    instances: Project[] | Task[],
    activeWorkspace: Organization | null,
    dstWorkspace: Organization | null,
    onOk: () => void,
): void {
    const first = instances[0];
    if (!first) {
        return;
    }

    const instanceType = first instanceof Task ? 'task' : 'project';
    const movingItems = instances.length > 1 ?
        t('{{length}} {{instanceType}}s', { length: instances.length, instanceType }) :
        t('the {{instanceType}} #{{id}}', { instanceType, id: first.id });
    let details = t('You are going to move {{movingItems}} ', { movingItems }) +
        t('to the {{value}}. ', { value: dstWorkspace ? t('organization {{slug}}', { slug: dstWorkspace.slug }) : t('personal workspace') });
    if (activeWorkspace) {
        details += instances.length > 1 ?
            t('Organization members will lose access to these resources.') :
            t('Organization members will lose access to this resource.');
    }

    Modal.confirm({
        title: t('Data transfer between workspaces'),
        content: t('{{details}} Would you like to proceed?', { details }),
        className: 'cvat-modal-confirm-project-transfer-between-workspaces',
        onOk,
        okButtonProps: {
            type: 'primary',
            danger: true,
        },
        okText: t('Continue'),
    });
}
