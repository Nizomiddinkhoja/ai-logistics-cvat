// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import Modal from 'antd/lib/modal';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import notification from 'antd/lib/notification';
import { RcFile } from 'antd/lib/upload';

import LocalFiles from 'components/file-manager/local-files';
import { CombinedState } from 'reducers';
import { getTasksAsync, switchAppendTaskDataModalVisible } from 'actions/tasks-actions';
import { Request, RQStatus, UpdateStatusData } from 'cvat-core-wrapper';
import { t } from 'i18n';

interface Props {
    onAppended?: () => void;
}

function AppendTaskDataModal({ onAppended }: Readonly<Props>): JSX.Element {
    const dispatch = useDispatch();
    const { visible, taskInstance, tasksQuery } = useSelector((state: CombinedState) => ({
        visible: state.tasks.appendData.modalVisible,
        taskInstance: state.tasks.appendData.taskInstance,
        tasksQuery: state.tasks.gettingQuery,
    }), shallowEqual);
    const mounted = useRef(false);

    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ message: string; progress: number }>({ message: '', progress: 0 });

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const closeModal = useCallback(() => {
        setFiles([]);
        dispatch(switchAppendTaskDataModalVisible(false));
    }, []);

    const onUpload = useCallback((_: RcFile, uploadedFiles: RcFile[]): boolean => {
        setFiles(uploadedFiles.filter((file) => file.type.startsWith('image/')));
        return false;
    }, []);

    const onUpdateStatus = useCallback((updateData: Request | UpdateStatusData): void => {
        if (mounted.current) {
            const defaultMessage = updateData.status === RQStatus.QUEUED ?
                t('The request has been queued') : t('CVAT is adding the images to the task');
            setStatus({
                message: updateData.message || defaultMessage,
                progress: updateData.progress ?? 0,
            });
        }
    }, []);

    const onSubmit = async (): Promise<void> => {
        if (!taskInstance) {
            return;
        }

        if (!files.length) {
            notification.error({
                message: t('Please, select images to add'),
                className: 'cvat-notification-notice-append-task-data-failed',
            });
            return;
        }

        setUploading(true);
        setStatus({ message: '', progress: 0 });
        try {
            await taskInstance.appendData(files, { updateStatusCallback: onUpdateStatus });
            notification.info({
                message: t('New images have been added to the task #{{id}}', { id: taskInstance.id }),
                className: 'cvat-notification-notice-append-task-data-done',
            });

            if (onAppended) {
                onAppended();
            } else {
                dispatch(getTasksAsync(tasksQuery, false));
            }

            if (mounted.current) {
                closeModal();
            }
        } catch (error: unknown) {
            notification.error({
                message: t('Could not add images to the task #{{id}}', { id: taskInstance.id }),
                description: error instanceof Error ? error.message : `${error}`,
                className: 'cvat-notification-notice-append-task-data-failed',
            });
        } finally {
            if (mounted.current) {
                setUploading(false);
            }
        }
    };

    return (
        <Modal
            open={visible}
            title={t('Add images to the task #{{id}}', { id: taskInstance?.id })}
            className='cvat-append-task-data-modal'
            okText={t('Add')}
            onOk={onSubmit}
            onCancel={closeModal}
            okButtonProps={{ loading: uploading, disabled: !files.length }}
            cancelButtonProps={{ disabled: uploading }}
            closable={!uploading}
            maskClosable={!uploading}
            keyboard={!uploading}
            destroyOnClose
        >
            <Paragraph type='secondary'>
                {t('New images are added to the end of the task, and new jobs are created for them. Existing frames, jobs and annotations are not changed.')}
            </Paragraph>
            {uploading ? (
                <>
                    <Text className='cvat-text-color'>{status.message}</Text>
                    <Progress percent={Math.floor(status.progress * 100)} status='active' />
                </>
            ) : (
                <LocalFiles
                    files={files}
                    hint={t('Only image files are supported')}
                    onUpload={onUpload}
                />
            )}
        </Modal>
    );
}

export default React.memo(AppendTaskDataModal);
