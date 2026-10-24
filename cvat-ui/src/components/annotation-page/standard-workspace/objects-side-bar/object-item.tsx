// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useContext } from 'react';
import Text from 'antd/lib/typography/Text';
import Collapse from 'antd/lib/collapse';

import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { ColorBy } from 'reducers';
import { ObjectType, ShapeType } from 'cvat-core-wrapper';
import type { OrientationAngle } from 'utils/change-object-orientation';
import { t } from 'i18n';
import ObjectItemElementComponent from './object-item-element';
import ItemBasics from './object-item-basics';
import ObjectsListOrderingContext from './objects-list-ordering';

interface Props {
    normalizedKeyMap: Record<string, string>;
    activated: boolean;
    selected: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | null;
    labelID: number;
    isGroundTruth: boolean;
    locked: boolean;
    elements: number[];
    color: string;
    colorBy: ColorBy;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    zLayerDragProps?: React.HTMLAttributes<HTMLElement>;
    zLayerDragging?: boolean;
    zOrder: number;
    activate(activeElementID?: number): void;
    toggleSelection(): void;
    selectRange(orderedClientIDs: number[]): void;
    focusAndExpand(): void;
    copy(): void;
    propagate(): void;
    switchOrientation(): void;
    changeOrientation(degrees: OrientationAngle): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
    toOneLayerBackward(): void;
    toOneLayerForward(): void;
    toSpecificLayer(zOrder: number): void;
    remove(): void;
    changeLabel(label: any): void;
    changeColor(color: string): void;
    resetCuboidPerspective(): void;
    runAnnotationAction(): void;
    edit(): void;
    slice(): void;
    simplify(): void;
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        selected,
        objectType,
        shapeType,
        clientID,
        serverID,
        locked,
        labelID,
        color,
        colorBy,
        elements,
        labels,
        zLayerDragProps,
        zLayerDragging,
        zOrder,
        normalizedKeyMap,
        isGroundTruth,
        activate,
        toggleSelection,
        selectRange,
        focusAndExpand,
        copy,
        propagate,
        createURL,
        switchOrientation,
        changeOrientation,
        toBackground,
        toForeground,
        toOneLayerForward,
        toOneLayerBackward,
        toSpecificLayer,
        remove,
        changeLabel,
        changeColor,
        resetCuboidPerspective,
        runAnnotationAction,
        edit,
        slice,
        simplify,
        jobInstance,
    } = props;

    const type =
        objectType === ObjectType.TAG ?
            ObjectType.TAG.toUpperCase() :
            `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = [
        'cvat-objects-sidebar-state-item',
        ...(activated ? ['cvat-objects-sidebar-state-active-item'] : []),
        ...(selected ? ['cvat-objects-sidebar-state-item-selected'] : []),
        ...(zLayerDragging ? ['cvat-objects-sidebar-state-item-dragging'] : []),
    ].join(' ');

    const sidebarOrdering = useContext(ObjectsListOrderingContext);

    const activateState = useCallback(() => {
        activate();
    }, []);

    // ctrl+click toggles an object in the multi selection, shift+click takes the whole range
    const onClick = useCallback((event: React.MouseEvent): void => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleSelection();
        } else if (event.shiftKey) {
            event.preventDefault();
            // the browser selects the text between two shift clicks, it is not wanted here
            window.getSelection()?.removeAllRanges();
            selectRange(sidebarOrdering);
        }
    }, [toggleSelection, selectRange, sidebarOrdering]);

    return (
        <div style={{ display: 'flex', marginBottom: '1px' }}>
            <div
                {...zLayerDragProps}
                onMouseEnter={activateState}
                onClick={onClick}
                onDoubleClick={focusAndExpand}
                id={`cvat-objects-sidebar-state-item-${clientID}`}
                className={`${className}${zLayerDragProps ? ' cvat-objects-sidebar-state-item-draggable' : ''}`}
                style={{ '--state-item-background': `${color}` } as React.CSSProperties}
            >
                <ItemBasics
                    jobInstance={jobInstance}
                    serverID={serverID}
                    clientID={clientID}
                    labelID={labelID}
                    labels={labels}
                    shapeType={shapeType}
                    objectType={objectType}
                    color={color}
                    colorBy={colorBy}
                    type={type}
                    locked={locked}
                    isGroundTruth={isGroundTruth}
                    copyShortcut={normalizedKeyMap.COPY_SHAPE}
                    pasteShortcut={normalizedKeyMap.PASTE_SHAPE}
                    propagateShortcut={normalizedKeyMap.PROPAGATE_OBJECT}
                    toBackgroundShortcut={normalizedKeyMap.TO_BACKGROUND}
                    toForegroundShortcut={normalizedKeyMap.TO_FOREGROUND}
                    toOneLayerBackwardShortcut={normalizedKeyMap.TO_ONE_LAYER_BACKWARD}
                    toOneLayerForwardShortcut={normalizedKeyMap.TO_ONE_LAYER_FORWARD}
                    zOrder={zOrder}
                    removeShortcut={normalizedKeyMap.DELETE_OBJECT_STANDARD_WORKSPACE}
                    changeColorShortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                    sliceShortcut={normalizedKeyMap.SWITCH_SLICE_MODE}
                    runAnnotationsActionShortcut={normalizedKeyMap.RUN_ANNOTATIONS_ACTION}
                    changeLabel={changeLabel}
                    changeColor={changeColor}
                    copy={copy}
                    remove={remove}
                    propagate={propagate}
                    createURL={createURL}
                    switchOrientation={switchOrientation}
                    changeOrientation={changeOrientation}
                    toBackground={toBackground}
                    toForeground={toForeground}
                    toOneLayerBackward={toOneLayerBackward}
                    toOneLayerForward={toOneLayerForward}
                    toSpecificLayer={toSpecificLayer}
                    resetCuboidPerspective={resetCuboidPerspective}
                    edit={edit}
                    slice={slice}
                    simplify={simplify}
                    runAnnotationAction={runAnnotationAction}
                />
                <ObjectButtonsContainer clientID={clientID} />
                <ItemDetailsContainer
                    readonly={locked}
                    clientID={clientID}
                    parentID={null}
                />
                {!!elements.length && (
                    <Collapse
                        className='cvat-objects-sidebar-state-item-elements-collapse'
                        items={[{
                            key: 'elements',
                            label: <Text style={{ fontSize: 10 }} type='secondary'>{t('PARTS')}</Text>,
                            children: elements.map((element: number) => (
                                <ObjectItemElementComponent
                                    key={element}
                                    parentID={clientID}
                                    clientID={element}
                                    onMouseLeave={activateState}
                                />
                            )),
                        }]}
                    />
                )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent);
