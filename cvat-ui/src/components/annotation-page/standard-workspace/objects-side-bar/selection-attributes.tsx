// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';

import config from 'config';
import { Attribute } from 'cvat-core-wrapper';
import { clamp } from 'utils/math';
import { t } from 'i18n';

interface Props {
    attributes: Attribute[];
    // the value of every attribute, null when the selected objects have different values
    values: Record<number, string | null>;
    onChange(attrID: number, value: string): void;
}

function renderValue(value: string): string {
    return value === config.UNDEFINED_ATTRIBUTE_VALUE ? config.NO_BREAK_SPACE : value;
}

function SelectionAttributeField(props: {
    attribute: Attribute;
    value: string | null;
    onChange(value: string): void;
}): JSX.Element {
    const { attribute, value, onChange } = props;
    const placeholder = t('Different values');

    if (attribute.inputType === 'checkbox') {
        return (
            <Checkbox
                className='cvat-objects-sidebar-selection-attribute-checkbox'
                checked={value === 'true'}
                indeterminate={value === null}
                onChange={(event) => onChange(event.target.checked ? 'true' : 'false')}
            >
                <Text className='cvat-text'>{attribute.name}</Text>
            </Checkbox>
        );
    }

    let field: JSX.Element;
    if (attribute.inputType === 'radio') {
        field = (
            <Radio.Group
                size='small'
                value={value ?? undefined}
                onChange={(event) => onChange(event.target.value)}
            >
                {attribute.values.map((option: string) => (
                    <Radio key={option} value={option}>{renderValue(option)}</Radio>
                ))}
            </Radio.Group>
        );
    } else if (attribute.inputType === 'select') {
        field = (
            <Select
                size='small'
                placeholder={placeholder}
                value={value ?? undefined}
                onChange={onChange}
            >
                {attribute.values.map((option: string) => (
                    <Select.Option key={option} value={option}>{renderValue(option)}</Select.Option>
                ))}
            </Select>
        );
    } else if (attribute.inputType === 'number') {
        const [min, max, step] = attribute.values.map((option: string): number => +option);
        field = (
            <InputNumber
                size='small'
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
                value={value === null ? null : +value}
                onChange={(newValue: number | null) => {
                    if (newValue !== null) {
                        onChange(`${clamp(+newValue, min, max)}`);
                    }
                }}
            />
        );
    } else {
        field = (
            <Input
                size='small'
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(event) => onChange(event.target.value)}
            />
        );
    }

    return (
        <>
            <Text className='cvat-text cvat-objects-sidebar-selection-attribute-name'>{attribute.name}</Text>
            {field}
        </>
    );
}

function SelectionAttributes(props: Props): JSX.Element {
    const { attributes, values, onChange } = props;

    return (
        <div className='cvat-objects-sidebar-selection-attributes'>
            {attributes.map((attribute: Attribute) => (
                <div
                    key={attribute.id}
                    className={[
                        'cvat-objects-sidebar-selection-attribute',
                        `cvat-objects-sidebar-selection-attribute-${attribute.inputType}`,
                    ].join(' ')}
                >
                    <SelectionAttributeField
                        attribute={attribute}
                        value={values[attribute.id as number] ?? null}
                        onChange={(value: string) => onChange(attribute.id as number, value)}
                    />
                </div>
            ))}
        </div>
    );
}

export default React.memo(SelectionAttributes);
