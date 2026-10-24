// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';

import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
    pointerWithin, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    CaretDownOutlined, CaretRightOutlined, CopyOutlined, DeleteOutlined, EyeInvisibleOutlined,
    EyeOutlined, LockOutlined, SnippetsOutlined, VerticalAlignMiddleOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { StatesOrdering, Workspace } from 'reducers';
import { Label, ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import CVATTooltip from 'components/common/cvat-tooltip';
import LabelSelector from 'components/label-selector/label-selector';
import {
    OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT,
} from 'utils/objects-sidebar';
import { t } from 'i18n';

import ObjectListHeader from './objects-list-header';
import {
    type LayerPlacement,
    type PointerPosition,
    type LayerMoveSource,
    isLayerState,
    isLayerDroppedBesideItself,
    parseLayerDragID,
    parseLayerDropID,
    parseLayerInsertDropID,
    parseObjectDragID,
} from './drag-and-drop';
import LayerInsertDropArea from './drag-and-drop/layer-insert-drop-area';
import LayerSection from './drag-and-drop/layer-section';
import ObjectsListOrderingContext from './objects-list-ordering';

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    currentLayer: number;
    hiddenLayers: Set<number>;
    sortedStatesID: number[];
    objectStates: ObjectState[];
    selectedStateIDs: number[];
    visibleSkeletonElements: Record<number, number[]>;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    showGroundTruth: boolean;
    changeStatesOrdering(value: StatesOrdering): void;
    selectLayer(zOrder: number): void;
    toggleLayersVisibility(zOrders: number[]): void;
    moveObjectsToLayer(source: LayerMoveSource, targetZOrder: number): void;
    moveObjectsOnNewLayer(source: LayerMoveSource, placement: LayerPlacement): void;
    compactLayers(): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
    changeShowGroundTruth(): void;
    clearSelection(): void;
    lockSelectedStates(): void;
    hideSelectedStates(): void;
    removeSelectedStates(): void;
    selectionLabels: Label[];
    changeSelectedStatesLabel(label: Label): void;
    clipboardObjectsCount: number;
    copySelectedStates(): void;
    pasteFromClipboard(): void;
    clearClipboard(): void;
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        workspace,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        statesOrdering,
        currentLayer,
        hiddenLayers,
        sortedStatesID,
        objectStates,
        selectedStateIDs,
        visibleSkeletonElements,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        showGroundTruth,
        changeStatesOrdering,
        selectLayer,
        toggleLayersVisibility,
        moveObjectsToLayer,
        moveObjectsOnNewLayer,
        compactLayers,
        lockAllStates,
        unlockAllStates,
        collapseAllStates,
        expandAllStates,
        hideAllStates,
        showAllStates,
        changeShowGroundTruth,
        clearSelection,
        lockSelectedStates,
        hideSelectedStates,
        removeSelectedStates,
        selectionLabels,
        changeSelectedStatesLabel,
        clipboardObjectsCount,
        copySelectedStates,
        pasteFromClipboard,
        clearClipboard,
    } = props;

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 6,
        },
    }));
    // Keep collapse state in the list so expand/open events and collapse-all can coordinate all sections.
    const [collapsedLayers, setCollapsedLayers] = useState<Set<number>>(() => new Set());
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [activeDragID, setActiveDragID] = useState<string | null>(null);
    const [dragPointerPosition, setDragPointerPosition] = useState<PointerPosition | null>(null);
    const [pendingExpandedLayerItemID, setPendingExpandedLayerItemID] = useState<string | null>(null);
    // the label picked for the multi selection, it is kept to be applied to the next selections too
    const [selectionLabel, setSelectionLabel] = useState<Label | null>(null);
    const layerObjectStates = objectStates.filter(isLayerState);
    const zLayers = Array.from(
        new Set(layerObjectStates.map((state) => state.zOrder)),
    ).sort((left: number, right: number): number => left - right);

    const allLayersCollapsed = !!zLayers.length && zLayers.every((zOrder: number): boolean => (
        collapsedLayers.has(zOrder)
    ));

    // Remove collapse markers for layers that disappeared after filtering or z-order changes.
    useEffect((): void => {
        const availableLayers = new Set(zLayers);

        setCollapsedLayers((current: Set<number>): Set<number> => {
            const next = new Set<number>();

            current.forEach((zOrder: number): void => {
                if (availableLayers.has(zOrder)) {
                    next.add(zOrder);
                }
            });

            return next;
        });
    }, [zLayers.join(',')]);

    useEffect((): void => {
        if (!pendingExpandedLayerItemID) {
            return;
        }

        const sidebarItem = window.document.getElementById(pendingExpandedLayerItemID);

        if (sidebarItem) {
            sidebarItem.scrollIntoView({ block: 'nearest' });
            setPendingExpandedLayerItemID(null);
        }
    }, [collapsedLayers, pendingExpandedLayerItemID]);

    // React to external requests to expand the layer containing a target object.
    useEffect((): () => void => {
        const onExpandLayer = (event: Event): void => {
            const { clientID, parentID } = (
                event as CustomEvent<{ clientID: number; parentID: number | null }>
            ).detail;

            const expandedState = objectStates.find((state: ObjectState): boolean => (
                state.clientID === (parentID ?? clientID)
            ));

            if (expandedState) {
                if (collapsedLayers.has(expandedState.zOrder)) {
                    const itemID = Number.isInteger(parentID) ?
                        `cvat-objects-sidebar-state-item-element-${clientID}` :
                        `cvat-objects-sidebar-state-item-${clientID}`;

                    setPendingExpandedLayerItemID(itemID);
                }

                setCollapsedLayers((current: Set<number>): Set<number> => {
                    const next = new Set(current);
                    next.delete(expandedState.zOrder);
                    return next;
                });
            }
        };

        window.addEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandLayer);

        return (): void => {
            window.removeEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandLayer);
        };
    }, [collapsedLayers, objectStates]);

    // Track the pointer only during drag so nearby insert gaps can expand.
    useEffect((): (() => void) | undefined => {
        if (!dragActive) {
            return undefined;
        }

        const onPointerMove = (event: PointerEvent): void => {
            setDragPointerPosition({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener('pointermove', onPointerMove);
        return (): void => {
            window.removeEventListener('pointermove', onPointerMove);
        };
    }, [dragActive]);

    const objectIdsByLayer = sortedStatesID
        .reduce((acc: Record<number, number[]>, id: number): Record<number, number[]> => {
            const object = layerObjectStates.find((state: ObjectState): boolean => state.clientID === id);

            if (object) {
                acc[object.zOrder] = acc[object.zOrder] || [];
                acc[object.zOrder].push(id);
            }

            return acc;
        }, {});

    const onDragEnd = useCallback((event: DragEndEvent): void => {
        const { active, over } = event;

        setDragActive(false);
        setActiveDragID(null);
        setDragPointerPosition(null);

        if (!over) {
            return;
        }

        const clientID = parseObjectDragID(String(active.id));
        const sourceZOrder = parseLayerDragID(String(active.id));
        const zOrder = parseLayerDropID(String(over.id));
        const placement = parseLayerInsertDropID(String(over.id));

        if (clientID !== null && zOrder !== null) {
            // Dropping an object onto an existing layer moves it into that layer.
            moveObjectsToLayer({ clientID }, zOrder);
        } else if (clientID !== null && placement !== null) {
            // Dropping an object between layers creates a new layer before/after a layout boundary.
            moveObjectsOnNewLayer({ clientID }, placement);
        } else if (sourceZOrder !== null && zOrder !== null) {
            // Dropping a layer onto an existing layer merges both layers.
            moveObjectsToLayer({ zOrder: sourceZOrder }, zOrder);
        } else if (sourceZOrder !== null && placement !== null) {
            if (isLayerDroppedBesideItself(sourceZOrder, placement)) {
                return;
            }

            // Dropping a layer between layers creates a new layer before/after a layout boundary.
            moveObjectsOnNewLayer({ zOrder: sourceZOrder }, placement);
        }
    }, [moveObjectsOnNewLayer, moveObjectsToLayer]);

    const onDragStart = useCallback((event: DragStartEvent): void => {
        setDragActive(true);
        setActiveDragID(String(event.active.id));
    }, []);

    const onDragCancel = useCallback((): void => {
        setDragActive(false);
        setActiveDragID(null);
        setDragPointerPosition(null);
    }, []);

    const toggleLayerCollapsed = (zOrder: number): void => {
        setCollapsedLayers((current: Set<number>): Set<number> => {
            const next = new Set(current);

            if (next.has(zOrder)) {
                next.delete(zOrder);
            } else {
                next.add(zOrder);
            }

            return next;
        });
    };

    const toggleAllLayersCollapsed = (): void => {
        setCollapsedLayers(allLayersCollapsed ? new Set() : new Set(zLayers));
    };

    const toggleLayerVisibility = (zOrder: number, includeLower: boolean): void => {
        toggleLayersVisibility(includeLower ? [zOrder, ...zLayers.filter((layer) => layer < zOrder)] : [zOrder]);
    };

    const renderDragOverlay = (): JSX.Element | null => {
        if (!activeDragID) {
            return null;
        }

        const clientID = parseObjectDragID(activeDragID);

        if (clientID !== null) {
            return (
                <div className='cvat-objects-sidebar-z-layer-drag-overlay'>
                    <ObjectItemContainer
                        objectStates={objectStates}
                        clientID={clientID}
                        visibleSkeletonElements={visibleSkeletonElements}
                        allowSimplifyLifecycle
                        zLayerDragging
                    />
                </div>
            );
        }

        const zOrder = parseLayerDragID(activeDragID);

        if (zOrder === null) {
            return null;
        }

        const visible = !hiddenLayers.has(zOrder);

        return (
            <div className='cvat-objects-sidebar-z-layer-mark cvat-objects-sidebar-z-layer-mark-dragging'>
                <Text strong>{t('Layer')} {zOrder}</Text>
                <span className='cvat-objects-sidebar-z-layer-visibility-indicator'>
                    {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </span>
            </div>
        );
    };

    // the label shared by the whole selection, if there is one
    const selectedLabelIDs = new Set(
        objectStates
            .filter((state: ObjectState) => selectedStateIDs.includes(state.clientID as number))
            .map((state: ObjectState) => state.label.id),
    );
    const commonSelectedLabelID = selectedLabelIDs.size === 1 ? [...selectedLabelIDs][0] as number : null;

    return (
        <ObjectsListOrderingContext.Provider value={sortedStatesID}>
            <ObjectListHeader
                workspace={workspace}
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                statesCollapsed={statesCollapsedAll}
                statesOrdering={statesOrdering}
                switchLockAllShortcut={switchLockAllShortcut}
                switchHiddenAllShortcut={switchHiddenAllShortcut}
                showGroundTruth={showGroundTruth}
                count={objectStates.length}
                changeStatesOrdering={changeStatesOrdering}
                lockAllStates={lockAllStates}
                unlockAllStates={unlockAllStates}
                collapseAllStates={collapseAllStates}
                expandAllStates={expandAllStates}
                hideAllStates={hideAllStates}
                showAllStates={showAllStates}
                changeShowGroundTruth={changeShowGroundTruth}
            />
            {!!selectedStateIDs.length && (
                <div className='cvat-objects-sidebar-selection-panel'>
                    <div className='cvat-objects-sidebar-selection-label'>
                        <CVATTooltip title={t('Set this label for every selected object')}>
                            <LabelSelector
                                className='cvat-objects-sidebar-selection-label-selector'
                                size='small'
                                placeholder={t('Label for the selected objects')}
                                labels={selectionLabels}
                                value={selectionLabel ?? commonSelectedLabelID}
                                onChange={setSelectionLabel}
                            />
                        </CVATTooltip>
                        <Button
                            className='cvat-objects-sidebar-selection-label-apply-button'
                            type='primary'
                            size='small'
                            disabled={!selectionLabel}
                            onClick={() => {
                                if (selectionLabel) {
                                    changeSelectedStatesLabel(selectionLabel);
                                }
                            }}
                        >
                            {t('Apply')}
                        </Button>
                    </div>
                    <Text strong>{t('{{length}} selected', { length: selectedStateIDs.length })}</Text>
                    <div className='cvat-objects-sidebar-selection-actions'>
                        <CVATTooltip title={t('Copy selected objects, they can be pasted on any other frame or task')}>
                            <Button
                                className='cvat-objects-sidebar-selection-copy-button'
                                type='text'
                                size='small'
                                icon={<CopyOutlined />}
                                onClick={copySelectedStates}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={t('Lock/unlock selected objects')}>
                            <Button
                                className='cvat-objects-sidebar-selection-lock-button'
                                type='text'
                                size='small'
                                icon={<LockOutlined />}
                                onClick={lockSelectedStates}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={t('Hide/show selected objects')}>
                            <Button
                                className='cvat-objects-sidebar-selection-hide-button'
                                type='text'
                                size='small'
                                icon={<EyeInvisibleOutlined />}
                                onClick={hideSelectedStates}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={t('Delete selected objects')}>
                            <Button
                                className='cvat-objects-sidebar-selection-remove-button'
                                type='text'
                                size='small'
                                danger
                                icon={<DeleteOutlined />}
                                onClick={removeSelectedStates}
                            />
                        </CVATTooltip>
                        <Button
                            className='cvat-objects-sidebar-selection-clear-button'
                            type='link'
                            size='small'
                            onClick={clearSelection}
                        >
                            {t('Clear')}
                        </Button>
                    </div>
                </div>
            )}
            {!!clipboardObjectsCount && (
                <div className='cvat-objects-sidebar-clipboard-panel'>
                    <Text type='secondary'>{t('Clipboard: {{clipboardObjectsCount}} object(s)', { clipboardObjectsCount })}</Text>
                    <div className='cvat-objects-sidebar-clipboard-actions'>
                        <CVATTooltip title={t('Paste the copied objects on the current frame')}>
                            <Button
                                className='cvat-objects-sidebar-clipboard-paste-button'
                                type='text'
                                size='small'
                                icon={<SnippetsOutlined />}
                                onClick={pasteFromClipboard}
                            />
                        </CVATTooltip>
                        <Button
                            className='cvat-objects-sidebar-clipboard-clear-button'
                            type='link'
                            size='small'
                            onClick={clearClipboard}
                        >
                            {t('Clear')}
                        </Button>
                    </div>
                </div>
            )}
            <div className='cvat-objects-sidebar-states-list'>
                {statesOrdering === StatesOrdering.LAYER ? (
                    <div className='cvat-objects-sidebar-z-layers-panel'>
                        <div className='cvat-objects-sidebar-z-layers-title'>
                            <Text strong>{t('Layer stack')}</Text>
                            <CVATTooltip title={t('Compact layers')}>
                                <Button
                                    className='cvat-objects-sidebar-z-layers-compact-button'
                                    type='text'
                                    size='small'
                                    icon={<VerticalAlignMiddleOutlined />}
                                    onClick={compactLayers}
                                />
                            </CVATTooltip>
                            <CVATTooltip title={allLayersCollapsed ? t('Expand all layers') : t('Collapse all layers')}>
                                <Button
                                    className='cvat-objects-sidebar-z-layers-collapse-all-button'
                                    type='text'
                                    size='small'
                                    icon={allLayersCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                                    onClick={toggleAllLayersCollapsed}
                                />
                            </CVATTooltip>
                        </div>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={pointerWithin}
                            onDragStart={onDragStart}
                            onDragCancel={onDragCancel}
                            onDragEnd={onDragEnd}
                        >
                            <div className='cvat-objects-sidebar-z-layers-stack'>
                                {zLayers.map((zOrder: number, index: number): JSX.Element => {
                                    const placement: LayerPlacement = index === 0 ?
                                        { before: zOrder } :
                                        { after: zLayers[index - 1] };

                                    return (
                                        <React.Fragment key={zOrder}>
                                            <LayerInsertDropArea
                                                placement={placement}
                                                pointerPosition={dragPointerPosition}
                                            />
                                            <LayerSection
                                                zOrder={zOrder}
                                                layerObjectIds={objectIdsByLayer[zOrder] || []}
                                                objectStates={layerObjectStates}
                                                visibleSkeletonElements={visibleSkeletonElements}
                                                selected={zOrder === currentLayer}
                                                visible={!hiddenLayers.has(zOrder)}
                                                collapsed={collapsedLayers.has(zOrder)}
                                                selectLayer={selectLayer}
                                                toggleLayerVisibility={toggleLayerVisibility}
                                                toggleLayerCollapsed={toggleLayerCollapsed}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                                {!!zLayers.length && (
                                    <LayerInsertDropArea
                                        placement={{ after: zLayers[zLayers.length - 1] }}
                                        pointerPosition={dragPointerPosition}
                                    />
                                )}
                            </div>
                            <DragOverlay
                                // dnd-kit's default drop animation scrolls the source node back into view.
                                // Disable it so wheel scrolling the sidebar during drag is preserved after drop.
                                dropAnimation={null}
                                // Let wheel/pointer events reach the sidebar under the drag preview.
                                style={{ pointerEvents: 'none' }}
                            >
                                {renderDragOverlay()}
                            </DragOverlay>
                        </DndContext>
                    </div>
                ) : sortedStatesID.map((id: number): JSX.Element => (
                    <ObjectItemContainer
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        visibleSkeletonElements={visibleSkeletonElements}
                        allowSimplifyLifecycle
                    />
                ))}
            </div>
        </ObjectsListOrderingContext.Provider>
    );
}

export default React.memo(ObjectListComponent);
