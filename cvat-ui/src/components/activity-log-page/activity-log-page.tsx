// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    useCallback, useEffect, useMemo, useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import Table, { ColumnsType, TablePaginationConfig } from 'antd/lib/table';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import DatePicker from 'antd/lib/date-picker';
import Tag from 'antd/lib/tag';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Descriptions from 'antd/lib/descriptions';
import notification from 'antd/lib/notification';
import { ReloadOutlined, ClearOutlined } from '@ant-design/icons';

import { CombinedState } from 'reducers';
import { getCore } from 'cvat-core-wrapper';
import { t } from 'i18n';
import {
    TECHNICAL_SCOPES, scopeColor, scopeLabel,
} from './scopes';

const core = getCore();

interface ActivityEvent {
    timestamp: string;
    scope: string;
    source: string;
    obj_name: string | null;
    obj_id: number | null;
    obj_val: string | null;
    count: number | null;
    duration: number;
    project_id: number | null;
    task_id: number | null;
    job_id: number | null;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    org_id: number | null;
    org_slug: string | null;
    payload: string | null;
    remote_addr: string | null;
}

interface Facets {
    scopes: { scope: string; count: number }[];
    users: { id: number; username: string; email: string; count: number }[];
}

interface Filters {
    page: number;
    pageSize: number;
    userID: number | null;
    scopes: string[];
    source: string | null;
    projectID: number | null;
    taskID: number | null;
    jobID: number | null;
    from: string | null;
    to: string | null;
    search: string;
    hideTechnical: boolean;
    oldestFirst: boolean;
}

const DEFAULT_FILTERS: Filters = {
    page: 1,
    pageSize: 50,
    userID: null,
    scopes: [],
    source: null,
    projectID: null,
    taskID: null,
    jobID: null,
    from: null,
    to: null,
    search: '',
    hideTechnical: true,
    oldestFirst: false,
};

function toInt(value: string | null): number | null {
    return value && Number.isInteger(+value) ? +value : null;
}

// filters are kept in the URL, so the page can be reloaded or shared
function filtersFromSearch(search: string): Filters {
    const params = new URLSearchParams(search);
    return {
        page: toInt(params.get('page')) ?? DEFAULT_FILTERS.page,
        pageSize: toInt(params.get('page_size')) ?? DEFAULT_FILTERS.pageSize,
        userID: toInt(params.get('user_id')),
        scopes: params.get('scope')?.split(',').filter(Boolean) ?? [],
        source: params.get('source'),
        projectID: toInt(params.get('project_id')),
        taskID: toInt(params.get('task_id')),
        jobID: toInt(params.get('job_id')),
        from: params.get('from'),
        to: params.get('to'),
        search: params.get('search') ?? '',
        hideTechnical: params.get('technical') !== '1',
        oldestFirst: params.get('sort') === 'timestamp',
    };
}

function filtersToSearch(filters: Filters): string {
    const params = new URLSearchParams();
    if (filters.page !== DEFAULT_FILTERS.page) params.set('page', `${filters.page}`);
    if (filters.pageSize !== DEFAULT_FILTERS.pageSize) params.set('page_size', `${filters.pageSize}`);
    if (filters.userID !== null) params.set('user_id', `${filters.userID}`);
    if (filters.scopes.length) params.set('scope', filters.scopes.join(','));
    if (filters.source) params.set('source', filters.source);
    if (filters.projectID !== null) params.set('project_id', `${filters.projectID}`);
    if (filters.taskID !== null) params.set('task_id', `${filters.taskID}`);
    if (filters.jobID !== null) params.set('job_id', `${filters.jobID}`);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.search) params.set('search', filters.search);
    if (!filters.hideTechnical) params.set('technical', '1');
    if (filters.oldestFirst) params.set('sort', 'timestamp');
    return params.toString();
}

function filtersToQuery(filters: Filters): Record<string, string | number> {
    const query: Record<string, string | number> = {
        page: filters.page,
        page_size: filters.pageSize,
    };
    if (filters.userID !== null) query.user_id = filters.userID;
    if (filters.scopes.length) {
        query.scope = filters.scopes.join(',');
    } else if (filters.hideTechnical) {
        query.exclude_scope = TECHNICAL_SCOPES.join(',');
    }
    if (filters.source) query.source = filters.source;
    if (filters.projectID !== null) query.project_id = filters.projectID;
    if (filters.taskID !== null) query.task_id = filters.taskID;
    if (filters.jobID !== null) query.job_id = filters.jobID;
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
    if (filters.search) query.search = filters.search;
    if (filters.oldestFirst) query.sort = 'timestamp';
    return query;
}

async function request<T>(path: string, params: Record<string, string | number>): Promise<T> {
    const response = await core.server.request(`${core.config.backendAPI}/events/activity-log${path}`, {
        method: 'GET',
        params,
    }) as { data: T };
    return response.data;
}

function formatPayload(payload: string | null): string | null {
    if (!payload) return null;
    try {
        return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
        return payload;
    }
}

// a short human readable summary of the event, shown in the table
function eventSummary(event: ActivityEvent): string {
    const parts: string[] = [];
    if (event.obj_name) parts.push(event.obj_name);
    if (event.obj_val !== null) parts.push(event.obj_name ? `→ ${event.obj_val}` : event.obj_val);

    if (event.payload) {
        try {
            const payload = JSON.parse(event.payload);
            if (typeof payload?.message === 'string') {
                parts.push(payload.message.split('\n')[0]);
            }
            if (typeof payload?.function?.id === 'string') {
                parts.push(t('model: {{name}}', { name: payload.function.id }));
            }
        } catch {
            // not every payload is JSON
        }
    }

    if (event.count !== null && event.count > 1) {
        parts.push(t('count: {{count}}', { count: event.count }));
    }

    return parts.join(' ');
}

function ResourceLinks(props: { event: ActivityEvent }): JSX.Element | null {
    const { event } = props;
    const links: JSX.Element[] = [];
    if (event.project_id) {
        links.push(
            <Link key='project' to={`/projects/${event.project_id}`}>
                {t('Project #{{id}}', { id: event.project_id })}
            </Link>,
        );
    }
    if (event.task_id) {
        links.push(
            <Link key='task' to={`/tasks/${event.task_id}`}>
                {t('Task #{{id}}', { id: event.task_id })}
            </Link>,
        );
    }
    if (event.job_id) {
        links.push(event.task_id ? (
            <Link key='job' to={`/tasks/${event.task_id}/jobs/${event.job_id}`}>
                {t('Job #{{id}}', { id: event.job_id })}
            </Link>
        ) : <Text key='job'>{t('Job #{{id}}', { id: event.job_id })}</Text>);
    }

    return links.length ? <div className='cvat-activity-log-resources'>{links}</div> : null;
}

function EventDetails(props: { event: ActivityEvent }): JSX.Element {
    const { event } = props;
    const payload = formatPayload(event.payload);

    return (
        <div className='cvat-activity-log-details'>
            <Descriptions size='small' column={{ xs: 1, md: 2, xl: 3 }} bordered>
                <Descriptions.Item label={t('Event')}>{event.scope}</Descriptions.Item>
                <Descriptions.Item label={t('Time (UTC)')}>{event.timestamp}</Descriptions.Item>
                <Descriptions.Item label={t('Email')}>{event.user_email ?? '—'}</Descriptions.Item>
                {event.obj_name !== null && (
                    <Descriptions.Item label={t('Field')}>{event.obj_name}</Descriptions.Item>
                )}
                {event.obj_id !== null && (
                    <Descriptions.Item label={t('Object ID')}>{event.obj_id}</Descriptions.Item>
                )}
                {event.obj_val !== null && (
                    <Descriptions.Item label={t('Value')}>{event.obj_val}</Descriptions.Item>
                )}
                {event.count !== null && (
                    <Descriptions.Item label={t('Count')}>{event.count}</Descriptions.Item>
                )}
                {!!event.duration && (
                    <Descriptions.Item label={t('Duration')}>
                        {t('{{duration}} ms', { duration: event.duration })}
                    </Descriptions.Item>
                )}
                {event.org_slug && (
                    <Descriptions.Item label={t('Organization')}>{event.org_slug}</Descriptions.Item>
                )}
                {event.remote_addr && (
                    <Descriptions.Item label={t('IP address')}>{event.remote_addr}</Descriptions.Item>
                )}
            </Descriptions>
            {payload && <pre className='cvat-activity-log-payload'>{payload}</pre>}
        </div>
    );
}

function ActivityLogPage(): JSX.Element {
    const history = useHistory();
    const location = useLocation();
    const user = useSelector((state: CombinedState) => state.auth.user);
    const isAdmin = !!user && (user.isSuperuser || user.groups.includes('admin'));

    const filters = useMemo(() => filtersFromSearch(location.search), [location.search]);
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [count, setCount] = useState<number>(0);
    const [fetching, setFetching] = useState<boolean>(false);
    const [facets, setFacets] = useState<Facets>({ scopes: [], users: [] });
    const [search, setSearch] = useState<string>(filters.search);
    const [reloadKey, setReloadKey] = useState<number>(0);

    const updateFilters = useCallback((changes: Partial<Filters>): void => {
        // any change except paging returns to the first page
        const page = 'page' in changes ? changes.page as number : 1;
        history.replace({ search: filtersToSearch({ ...filters, ...changes, page }) });
    }, [filters, history]);

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    useEffect((): (() => void) | undefined => {
        if (!isAdmin) return undefined;

        let cancelled = false;
        setFetching(true);
        request<{ count: number; results: ActivityEvent[] }>('', filtersToQuery(filters))
            .then((data) => {
                if (!cancelled) {
                    setEvents(data.results);
                    setCount(data.count);
                }
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    notification.error({
                        message: t('Could not fetch the activity log'),
                        description: error instanceof Error ? error.message : String(error),
                    });
                }
            })
            .finally(() => {
                if (!cancelled) setFetching(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isAdmin, location.search, reloadKey]);

    useEffect(() => {
        if (!isAdmin) return;

        const params: Record<string, string> = {};
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        request<Facets>('/facets', params).then(setFacets).catch(() => {
            // filters still work without the suggestions
        });
    }, [isAdmin, filters.from, filters.to, reloadKey]);

    const columns: ColumnsType<ActivityEvent> = [
        {
            title: t('Time'),
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 160,
            render: (value: string) => (
                <Text className='cvat-activity-log-time'>{dayjs(value).format('DD.MM.YYYY HH:mm:ss')}</Text>
            ),
        },
        {
            title: t('User'),
            key: 'user',
            width: 150,
            render: (_: unknown, event: ActivityEvent) => (event.user_id !== null ? (
                <Button
                    type='link'
                    size='small'
                    className='cvat-activity-log-user'
                    onClick={() => updateFilters({ userID: event.user_id })}
                >
                    {event.user_name ?? `#${event.user_id}`}
                </Button>
            ) : <Text type='secondary'>{t('System')}</Text>),
        },
        {
            title: t('Action'),
            key: 'scope',
            width: 210,
            render: (_: unknown, event: ActivityEvent) => (
                <Tag
                    className='cvat-activity-log-scope'
                    color={scopeColor(event.scope)}
                    onClick={() => updateFilters({ scopes: [event.scope] })}
                >
                    {scopeLabel(event.scope)}
                </Tag>
            ),
        },
        {
            title: t('Details'),
            key: 'details',
            render: (_: unknown, event: ActivityEvent) => {
                const summary = eventSummary(event);
                return (
                    <Text className='cvat-activity-log-object' ellipsis={{ tooltip: summary }}>
                        {summary || '—'}
                    </Text>
                );
            },
        },
        {
            title: t('Where'),
            key: 'resources',
            width: 300,
            render: (_: unknown, event: ActivityEvent) => <ResourceLinks event={event} />,
        },
        {
            title: t('Source'),
            dataIndex: 'source',
            key: 'source',
            width: 90,
            render: (value: string) => (value === 'client' ? t('Browser') : t('Server')),
        },
    ];

    const pagination: TablePaginationConfig = {
        current: filters.page,
        pageSize: filters.pageSize,
        total: count,
        showSizeChanger: true,
        pageSizeOptions: [20, 50, 100, 200],
        showTotal: (total: number) => t('Total: {{total}}', { total }),
    };

    if (!isAdmin) {
        return (
            <Result
                className='cvat-activity-log-forbidden'
                status='403'
                title={t('Access denied')}
                subTitle={t('Only administrators can view the activity log')}
            />
        );
    }

    const range: [Dayjs | null, Dayjs | null] | null = filters.from || filters.to ?
        [filters.from ? dayjs(filters.from) : null, filters.to ? dayjs(filters.to) : null] : null;

    return (
        <div className='cvat-activity-log-page'>
            <div className='cvat-activity-log-header'>
                <Title level={4} className='cvat-text-color'>{t('Activity log')}</Title>
                <div className='cvat-activity-log-header-actions'>
                    <Button icon={<ClearOutlined />} onClick={() => history.replace({ search: '' })}>
                        {t('Reset filters')}
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        loading={fetching}
                        onClick={() => setReloadKey((key) => key + 1)}
                    >
                        {t('Refresh')}
                    </Button>
                </div>
            </div>
            <div className='cvat-activity-log-filters'>
                <DatePicker.RangePicker
                    className='cvat-activity-log-period'
                    showTime={{ format: 'HH:mm' }}
                    format='DD.MM.YYYY HH:mm'
                    allowEmpty={[true, true]}
                    value={range}
                    presets={[
                        { label: t('Last hour'), value: [dayjs().subtract(1, 'hour'), dayjs()] },
                        { label: t('Today'), value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                        { label: t('Last 7 days'), value: [dayjs().subtract(7, 'day'), dayjs()] },
                        { label: t('Last 30 days'), value: [dayjs().subtract(30, 'day'), dayjs()] },
                    ]}
                    onChange={(value) => updateFilters({
                        from: value?.[0]?.toISOString() ?? null,
                        to: value?.[1]?.toISOString() ?? null,
                    })}
                />
                <Select
                    className='cvat-activity-log-user-filter'
                    allowClear
                    showSearch
                    placeholder={t('All users')}
                    optionFilterProp='label'
                    value={filters.userID ?? undefined}
                    onChange={(value?: number) => updateFilters({ userID: value ?? null })}
                    options={facets.users.map((item) => ({
                        value: item.id,
                        label: `${item.username} (${item.count})`,
                    }))}
                />
                <Select
                    className='cvat-activity-log-scope-filter'
                    mode='multiple'
                    allowClear
                    maxTagCount='responsive'
                    placeholder={t('All actions')}
                    optionFilterProp='label'
                    value={filters.scopes}
                    onChange={(value: string[]) => updateFilters({ scopes: value })}
                    options={facets.scopes
                        .map((item) => ({
                            value: item.scope,
                            label: `${scopeLabel(item.scope)} (${item.count})`,
                        }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                />
                <Select
                    className='cvat-activity-log-source-filter'
                    allowClear
                    placeholder={t('Any source')}
                    value={filters.source ?? undefined}
                    onChange={(value?: string) => updateFilters({ source: value ?? null })}
                    options={[
                        { value: 'client', label: t('Browser') },
                        { value: 'server', label: t('Server') },
                    ]}
                />
                <InputNumber
                    className='cvat-activity-log-id-filter'
                    min={1}
                    placeholder={t('Project ID')}
                    value={filters.projectID}
                    onChange={(value: number | null) => updateFilters({ projectID: value })}
                />
                <InputNumber
                    className='cvat-activity-log-id-filter'
                    min={1}
                    placeholder={t('Task ID')}
                    value={filters.taskID}
                    onChange={(value: number | null) => updateFilters({ taskID: value })}
                />
                <InputNumber
                    className='cvat-activity-log-id-filter'
                    min={1}
                    placeholder={t('Job ID')}
                    value={filters.jobID}
                    onChange={(value: number | null) => updateFilters({ jobID: value })}
                />
                <Input.Search
                    className='cvat-activity-log-search'
                    allowClear
                    placeholder={t('Search in users, fields and values')}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onSearch={(value: string) => updateFilters({ search: value.trim() })}
                />
                <Checkbox
                    checked={filters.hideTechnical}
                    disabled={!!filters.scopes.length}
                    onChange={(event) => updateFilters({ hideTechnical: event.target.checked })}
                >
                    {t('Hide technical events')}
                </Checkbox>
                <Checkbox
                    checked={filters.oldestFirst}
                    onChange={(event) => updateFilters({ oldestFirst: event.target.checked })}
                >
                    {t('Oldest first')}
                </Checkbox>
            </div>
            <Table<ActivityEvent>
                className='cvat-activity-log-table'
                size='small'
                rowKey={(event, index) => `${event.timestamp}-${event.scope}-${event.user_id}-${index}`}
                loading={fetching}
                columns={columns}
                dataSource={events}
                pagination={pagination}
                scroll={{ x: 1200 }}
                expandable={{
                    expandedRowRender: (event: ActivityEvent) => <EventDetails event={event} />,
                    expandRowByClick: true,
                }}
                onChange={(newPagination: TablePaginationConfig) => {
                    updateFilters({
                        page: newPagination.pageSize !== filters.pageSize ? 1 : newPagination.current ?? 1,
                        pageSize: newPagination.pageSize ?? filters.pageSize,
                    });
                }}
            />
        </div>
    );
}

export default React.memo(ActivityLogPage);
