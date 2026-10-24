// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AntdConfig as OriginalAntdConfig, Config } from '@react-awesome-query-builder/antd';
import ruRU from 'antd/lib/locale/ru_RU';
import { getLanguage, t } from 'i18n';

// texts of the query builder itself (buttons, placeholders, operator names, etc.)
const TEXT_SETTINGS = [
    'valueLabel', 'valuePlaceholder', 'fieldLabel', 'operatorLabel', 'funcLabel',
    'fieldPlaceholder', 'funcPlaceholder', 'operatorPlaceholder', 'lockLabel', 'lockedLabel',
    'deleteLabel', 'addGroupLabel', 'addCaseLabel', 'addDefaultCaseLabel', 'defaultCaseLabel',
    'addRuleLabel', 'addSubRuleLabel', 'delGroupLabel', 'notLabel',
    'fieldSourcesPopupTitle', 'valueSourcesPopupTitle',
];

function translateItems(items: unknown[]): unknown[] {
    return items.map((item) => (typeof item === 'string' ? t(item) : item));
}

function localizeConfig(config: Config): Config {
    if (getLanguage() === 'en') {
        return config;
    }

    const settings: Record<string, unknown> = { ...config.settings };
    for (const key of TEXT_SETTINGS) {
        if (typeof settings[key] === 'string') {
            settings[key] = t(settings[key] as string);
        }
    }
    settings.locale = { ...config.settings.locale, antd: ruRU };

    const operators = Object.fromEntries(Object.entries(config.operators).map(([key, operator]) => {
        const { valueLabels, textSeparators } = operator as { valueLabels?: unknown[]; textSeparators?: unknown[] };
        return [key, {
            ...operator,
            label: t(operator.label),
            ...(valueLabels ? { valueLabels: translateItems(valueLabels) } : {}),
            ...(textSeparators ? { textSeparators: translateItems(textSeparators) } : {}),
        }];
    }));

    const conjunctions = Object.fromEntries(Object.entries(config.conjunctions)
        .map(([key, conjunction]) => [key, { ...conjunction, label: t(conjunction.label) }]));

    return {
        ...config,
        settings: settings as unknown as Config['settings'],
        operators: operators as Config['operators'],
        conjunctions: conjunctions as Config['conjunctions'],
    };
}

const AntdConfig = localizeConfig(OriginalAntdConfig);

export default AntdConfig;
