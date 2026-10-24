// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { connect } from 'react-redux';
import Modal from 'antd/lib/modal';
import message from 'antd/lib/message';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    changeFrameAsync,
    collapseObjectItems,
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    switchPropagateVisibility as switchPropagateVisibilityAction,
    switchSimplifyVisibility as switchSimplifyVisibilityAction,
    removeObject as removeObjectAction,
    removeObjectsAsync,
    clearObjectsSelection as clearObjectsSelectionAction,
    copySelectedObjectsToClipboard,
    pasteObjectsFromClipboardAsync,
    clearObjectsClipboard as clearObjectsClipboardAction,
    CopyToClipboardResult,
    PasteFromClipboardResult,
    fetchAnnotationsAsync,
    changeHideActiveObjectAsync,
    updateLayerAsync,
    compactLayersAsync,
    switchZLayer,
    toggleZLayersVisibility,
} from 'actions/annotation-actions';
import {
    changeShowGroundTruth as changeShowGroundTruthAction,
} from 'actions/settings-actions';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import getHiddenZLayers from 'utils/get-hidden-z-layers';
import {
    CombinedState, StatesOrdering, ColorBy, Workspace,
    ActiveControl,
} from 'reducers';
import {
    Label, LabelType, ObjectState, ObjectType, ShapeType,
} from 'cvat-core-wrapper';
import { RenderData } from 'cvat-canvas-wrapper';
import { filterAnnotations } from 'utils/filter-annotations';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import {
    type LayerPlacement,
    type LayerMoveSource,
    isLayerState,
} from 'components/annotation-page/standard-workspace/objects-side-bar/drag-and-drop';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import { OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT } from 'utils/objects-sidebar';
import { t } from 'i18n';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    collapsedStates: Record<number, boolean>;
    objectStates: ObjectState[];
    annotationsFilters: any[];
    renderData: RenderData;
    colors: string[];
    colorBy: ColorBy;
    activatedStateID: number | null;
    activatedElementID: number | null;
    selectedStateIDs: number[];
    clipboardObjectsCount: number;
    minZLayer: number;
    maxZLayer: number;
    currentZLayer: number;
    hiddenZLayers: Set<number>;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    showGroundTruth: boolean;
    workspace: Workspace;
    editedState: ObjectState | null,
    activeControl: ActiveControl,
    activeObjectHidden: boolean,
}

interface DispatchToProps {
    updateAnnotations(...args: Parameters<typeof updateAnnotationsAsync>): void;
    collapseStates(...args: Parameters<typeof collapseObjectItems>): void;
    removeObject(...args: Parameters<typeof removeObjectAction>): void;
    removeObjects(...args: Parameters<typeof removeObjectsAsync>): Promise<number>;
    clearSelection(): void;
    copySelectedObjects(): CopyToClipboardResult;
    pasteObjectsFromClipboard(): Promise<PasteFromClipboardResult>;
    clearClipboard(): void;
    copyShape(...args: Parameters<typeof copyShapeAction>): void;
    switchPropagateVisibility(...args: Parameters<typeof switchPropagateVisibilityAction>): void;
    switchSimplifyVisibility(...args: Parameters<typeof switchSimplifyVisibilityAction>): void;
    changeFrame(...args: Parameters<typeof changeFrameAsync>): void;
    changeGroupColor(...args: Parameters<typeof changeGroupColorAsync>): void;
    changeShowGroundTruth(...args: Parameters<typeof changeShowGroundTruthAction>): void;
    changeHideEditedState(...args: Parameters<typeof changeHideActiveObjectAsync>): void;
    updateLayer(...args: Parameters<typeof updateLayerAsync>): void;
    compactLayers(...args: Parameters<typeof compactLayersAsync>): void;
    selectLayer(...args: Parameters<typeof switchZLayer>): void;
    toggleLayersVisibility(...args: Parameters<typeof toggleZLayersVisibility>): void;
}

const componentShortcuts = {
    SWITCH_ALL_LOCK: {
        name: t('Lock/unlock all objects'),
        description: t('Change locked state for all objects in the side bar'),
        sequences: ['t l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_LOCK: {
        name: t('Lock/unlock an object'),
        description: t('Change locked state for an active object'),
        sequences: ['l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_ALL_HIDDEN: {
        name: t('Hide/show all objects'),
        description: t('Change hidden state for objects in the side bar'),
        sequences: ['t h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_HIDDEN: {
        name: t('Hide/show an object'),
        description: t('Change hidden state for an active object'),
        sequences: ['h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_OCCLUDED: {
        name: t('Switch occluded'),
        description: t('Change occluded property for an active object'),
        sequences: ['q', '/'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_PINNED: {
        name: t('Switch pinned property'),
        description: t('Change pinned property for an active object'),
        sequences: ['p'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_KEYFRAME: {
        name: t('Switch keyframe'),
        description: t('Change keyframe property for an active track'),
        sequences: ['k'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_OUTSIDE: {
        name: t('Switch outside'),
        description: t('Change outside property for an active track'),
        sequences: ['o'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    DELETE_OBJECT_STANDARD_WORKSPACE: {
        name: t('Delete object'),
        description: t('Delete an active object. Use shift to force delete of locked objects'),
        sequences: ['del', 'shift+del'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_BACKGROUND: {
        name: t('Move to background'),
        description: t('Move an active object to the newly created background layer (decrease z-order value)'),
        sequences: ['-', '_'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_FOREGROUND: {
        name: t('Move to foreground'),
        description: t('Move an active object to the newly created foreground layer (increase z-order value)'),
        sequences: ['+', '='],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_ONE_LAYER_BACKWARD: {
        name: t('Move one layer backward'),
        description: t('Move an active object one layer backward (decrease z-order value)'),
        sequences: [],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    TO_ONE_LAYER_FORWARD: {
        name: t('Move one layer forward'),
        description: t('Move an active object one layer forward (increase z-order value)'),
        sequences: [],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    COPY_SHAPE: {
        name: t('Copy shape'),
        description: t('Copy shape to CVAT internal clipboard'),
        sequences: ['ctrl+c'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    RUN_ANNOTATIONS_ACTION: {
        name: t('Run annotations action'),
        description: t('Opens a dialog with annotations actions'),
        sequences: ['ctrl+e'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    PROPAGATE_OBJECT: {
        name: t('Propagate object'),
        description: t('Make a copy of the object on the following frames'),
        sequences: ['ctrl+b'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    NEXT_KEY_FRAME: {
        name: t('Next keyframe'),
        description: t('Go to the next keyframe of an active track'),
        sequences: ['shift+r'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    PREV_KEY_FRAME: {
        name: t('Previous keyframe'),
        description: t('Go to the previous keyframe of an active track'),
        sequences: ['e'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    CHANGE_OBJECT_COLOR: {
        name: t('Change color'),
        description: t('Set the next color for an activated shape'),
        sequences: ['enter'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SIMPLIFY_POLYGON: {
        name: t('Simplify polygon'),
        description: t('Activate simplification mode for the selected polygon or polyline'),
        sequences: [],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
};

registerComponentShortcuts(componentShortcuts);

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                renderData,
                collapsed,
                collapsedAll,
                activatedStateID,
                activatedElementID,
                selectedStateIDs,
                objectsClipboard,
                zLayer: {
                    min: minZLayer, max: maxZLayer, cur: currentZLayer,
                },
            },
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
            canvas: {
                activeControl, activeObjectHidden,
            },
            editing: { objectState: editedState },
            colors,
            workspace,
        },
        settings: {
            shapes: { colorBy, showGroundTruth },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    let statesHidden = true;
    let statesLocked = true;

    objectStates.forEach((objectState: ObjectState) => {
        const { lock } = objectState;
        if (!lock) {
            if (objectState.objectType === ObjectType.SHAPE || objectState.objectType === ObjectType.TRACK) {
                if (objectState.shapeType === ShapeType.SKELETON) {
                    objectState.elements.forEach((element: ObjectState) => {
                        statesHidden = statesHidden && (element.lock || element.hidden);
                    });
                } else {
                    statesHidden = statesHidden && objectState.hidden;
                }
            }
            statesLocked = statesLocked && objectState.lock;
        }
    });

    return {
        statesHidden,
        statesLocked,
        statesCollapsedAll: collapsedAll,
        collapsedStates: collapsed,
        objectStates,
        frameNumber,
        jobInstance,
        annotationsFilters,
        renderData,
        colors,
        colorBy,
        activatedStateID,
        activatedElementID,
        selectedStateIDs,
        clipboardObjectsCount: objectsClipboard.objects.length,
        minZLayer,
        maxZLayer,
        currentZLayer,
        hiddenZLayers: getHiddenZLayers(state),
        keyMap,
        normalizedKeyMap,
        showGroundTruth,
        workspace,
        editedState,
        activeControl,
        activeObjectHidden,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(...args: Parameters<typeof updateAnnotationsAsync>): void {
            dispatch(updateAnnotationsAsync(...args));
        },
        collapseStates(...args: Parameters<typeof collapseObjectItems>): void {
            dispatch(collapseObjectItems(...args));
        },
        removeObject(...args: Parameters<typeof removeObjectAction>): void {
            dispatch(removeObjectAction(...args));
        },
        removeObjects(...args: Parameters<typeof removeObjectsAsync>): Promise<number> {
            return dispatch(removeObjectsAsync(...args));
        },
        clearSelection(): void {
            dispatch(clearObjectsSelectionAction());
        },
        copySelectedObjects(): CopyToClipboardResult {
            return dispatch(copySelectedObjectsToClipboard());
        },
        pasteObjectsFromClipboard(): Promise<PasteFromClipboardResult> {
            return dispatch(pasteObjectsFromClipboardAsync());
        },
        clearClipboard(): void {
            dispatch(clearObjectsClipboardAction());
        },
        copyShape(...args: Parameters<typeof copyShapeAction>): void {
            dispatch(copyShapeAction(...args));
        },
        switchPropagateVisibility(...args: Parameters<typeof switchPropagateVisibilityAction>): void {
            dispatch(switchPropagateVisibilityAction(...args));
        },
        switchSimplifyVisibility(...args: Parameters<typeof switchSimplifyVisibilityAction>): void {
            dispatch(switchSimplifyVisibilityAction(...args));
        },
        changeFrame(...args: Parameters<typeof changeFrameAsync>): void {
            dispatch(changeFrameAsync(...args));
        },
        changeGroupColor(...args: Parameters<typeof changeGroupColorAsync>): void {
            dispatch(changeGroupColorAsync(...args));
        },
        changeShowGroundTruth(...args: Parameters<typeof changeShowGroundTruthAction>): void {
            dispatch(changeShowGroundTruthAction(...args));
            dispatch(fetchAnnotationsAsync());
        },
        changeHideEditedState(...args: Parameters<typeof changeHideActiveObjectAsync>): void {
            dispatch(changeHideActiveObjectAsync(...args));
        },
        updateLayer(...args: Parameters<typeof updateLayerAsync>): void {
            dispatch(updateLayerAsync(...args));
        },
        compactLayers(...args: Parameters<typeof compactLayersAsync>): void {
            dispatch(compactLayersAsync(...args));
        },
        selectLayer(...args: Parameters<typeof switchZLayer>): void {
            dispatch(switchZLayer(...args));
        },
        toggleLayersVisibility(...args: Parameters<typeof toggleZLayersVisibility>): void {
            dispatch(toggleZLayersVisibility(...args));
        },
    };
}

function sortAndMap(objectStates: ObjectState[], ordering: StatesOrdering): number[] {
    let sorted: ObjectState[] = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => (
            (a.clientID ?? 0) - (b.clientID ?? 0)
        ));
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => (
            (b.clientID ?? 0) - (a.clientID ?? 0)
        ));
    } else if (ordering === StatesOrdering.UPDATED) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => b.updated - a.updated);
    } else if (ordering === StatesOrdering.LAYER) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => a.zOrder - b.zOrder);
    } else if (ordering === StatesOrdering.LABEL_NAME) {
        sorted = [...objectStates].sort((a: ObjectState, b: ObjectState): number => {
            const labelComparison = a.label.name.localeCompare(b.label.name);
            if (labelComparison !== 0) {
                return labelComparison;
            }
            return (a.clientID ?? 0) - (b.clientID ?? 0);
        });
    } else {
        sorted = [...objectStates];
    }

    return sorted.map((state: ObjectState) => state.clientID).filter((id): id is number => id !== null);
}

type Props = StateToProps & DispatchToProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: ObjectState[];
    filteredStates: ObjectState[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            statesOrdering: StatesOrdering.ID_ASCENT,
            objectStates: [],
            filteredStates: [],
            sortedStatesID: [],
        };
    }

    public componentDidMount(): void {
        this.updateObjects();
        window.addEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, this.onOpenZLayerInSidebar);
    }

    public componentWillUnmount(): void {
        window.removeEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, this.onOpenZLayerInSidebar);
    }

    public componentDidUpdate(): void {
        const { objectStates } = this.props;
        const { objectStates: prevObjectStates } = this.state;
        if (objectStates !== prevObjectStates) {
            this.updateObjects();
        }
    }

    private updateObjects = (): void => {
        const {
            objectStates, frameNumber, workspace,
        } = this.props;
        const { statesOrdering } = this.state;
        const filteredStates = filterAnnotations(objectStates, {
            frame: frameNumber,
            workspace,
        });
        this.setState({
            objectStates,
            filteredStates,
            sortedStatesID: sortAndMap(filteredStates, statesOrdering),
        });
    };

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { filteredStates, statesOrdering: currentStatesOrdering } = this.state;
        if (statesOrdering === currentStatesOrdering) {
            return;
        }

        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(filteredStates, statesOrdering),
        });
    };

    private onOpenZLayerInSidebar = (): void => {
        this.onChangeStatesOrdering(StatesOrdering.LAYER);
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private onCollapseAllStates = (): void => {
        this.collapseAllStates(true);
    };

    private onExpandAllStates = (): void => {
        this.collapseAllStates(false);
    };

    private onHideAllStates = (): void => {
        this.hideAllStates(true);
    };

    private onShowAllStates = (): void => {
        this.hideAllStates(false);
    };

    private changeShowGroundTruth = (): void => {
        const { showGroundTruth, changeShowGroundTruth } = this.props;
        changeShowGroundTruth(!showGroundTruth);
    };

    private statesFromMoveSource(source: LayerMoveSource): ObjectState[] {
        const { filteredStates } = this.state;

        if ('clientID' in source) {
            const objectState = filteredStates.find((state: ObjectState): boolean => (
                state.clientID === source.clientID
            ));
            return objectState && isLayerState(objectState) ? [objectState] : [];
        }

        return filteredStates.filter((state: ObjectState): boolean => (
            isLayerState(state) && state.zOrder === source.zOrder
        ));
    }

    private moveObjectsToLayer = (source: LayerMoveSource, targetZOrder: number): void => {
        const { frameNumber, updateLayer } = this.props;
        const statesToMove = this.statesFromMoveSource(source);

        if (!statesToMove.length) {
            return;
        }

        updateLayer(frameNumber, { exact: targetZOrder }, statesToMove);
    };

    private moveObjectsOnNewLayer = (source: LayerMoveSource, placement: LayerPlacement): void => {
        const { frameNumber, updateLayer } = this.props;
        const statesToMove = this.statesFromMoveSource(source);

        if (!statesToMove.length) {
            return;
        }

        updateLayer(frameNumber, placement, statesToMove);
    };

    private compactLayers = (): void => {
        const { frameNumber, compactLayers } = this.props;
        compactLayers(frameNumber);
    };

    // Objects of the current multi selection, in the order they are displayed
    private selectedStates(): ObjectState[] {
        const { selectedStateIDs } = this.props;
        const { filteredStates, sortedStatesID } = this.state;

        return sortedStatesID
            .filter((clientID: number): boolean => selectedStateIDs.includes(clientID))
            .map((clientID: number): ObjectState | undefined => filteredStates
                .find((state: ObjectState): boolean => state.clientID === clientID))
            .filter((state: ObjectState | undefined): state is ObjectState => !!state);
    }

    private lockSelectedStates = (): void => {
        const { updateAnnotations } = this.props;
        const states = this.selectedStates();

        if (!states.length) {
            return;
        }

        const locked = states.every((state: ObjectState): boolean => state.lock);
        states.forEach((state: ObjectState): void => {
            state.lock = !locked;
        });

        updateAnnotations(states);
    };

    private hideSelectedStates = (): void => {
        const { updateAnnotations } = this.props;
        const states = this.selectedStates();

        if (!states.length) {
            return;
        }

        const hidden = states.every((state: ObjectState): boolean => state.hidden);
        states.forEach((state: ObjectState): void => {
            state.hidden = !hidden;
        });

        updateAnnotations(states);
    };

    private switchOccludedSelectedStates = (): void => {
        const { updateAnnotations } = this.props;
        const states = this.selectedStates().filter(isLayerState);

        if (!states.length) {
            return;
        }

        const occluded = states.every((state: ObjectState): boolean => state.occluded);
        states.forEach((state: ObjectState): void => {
            state.occluded = !occluded;
        });

        updateAnnotations(states);
    };

    private removeSelectedStates = (force = false): void => {
        const { removeObjects, clearSelection } = this.props;
        const states = this.selectedStates();

        if (!states.length) {
            return;
        }

        const removable = force ? states : states.filter((state: ObjectState): boolean => !state.lock);
        const lockedCount = states.length - removable.length;

        if (!removable.length) {
            Modal.info({
                title: t('Objects are locked'),
                content: t('Every selected object is locked. Unlock them or use shift+delete to remove anyway.'),
                className: 'cvat-modal-confirm-remove-object',
            });

            return;
        }

        const hasTracks = removable.some((state: ObjectState): boolean => state.objectType === ObjectType.TRACK);
        const notes = [
            ...(lockedCount ? [t('{{lockedCount}} locked object(s) will be kept.', { lockedCount })] : []),
            ...(hasTracks ? [t('The selection contains tracks, they will be removed on every frame.')] : []),
        ];

        Modal.confirm({
            title: t('Remove {{length}} object(s)', { length: removable.length }),
            content: t('Are you sure you want to remove them? {{notes}}', { notes: notes.join(' ') }).trim(),
            okType: 'danger',
            okText: t('Yes'),
            className: 'cvat-modal-confirm-remove-object',
            onOk: () => removeObjects(removable, force).then((): void => {
                clearSelection();
            }),
        });
    };

    // Sets one label for the whole multi selection, e.g. to fix classes after automatic annotation
    private changeSelectedStatesLabel = (label: Label, attributes: Record<number, string>): void => {
        const { updateAnnotations } = this.props;
        const selected = this.selectedStates();
        const changeable = selected.filter((state: ObjectState): boolean => (
            !state.lock &&
            state.shapeType !== ShapeType.SKELETON &&
            !state.parentID &&
            [state.shapeType || LabelType.TAG, LabelType.ANY].includes(label.type)
        ));

        // only attributes of the label can be set
        const labelAttributeIDs = label.attributes.map((attribute) => attribute.id);
        const changedAttributes = Object.fromEntries(
            Object.entries(attributes).filter(([attrID]) => labelAttributeIDs.includes(+attrID)),
        );

        const relabeled = changeable.filter((state: ObjectState): boolean => state.label.id !== label.id);
        const states = changeable.filter((state: ObjectState): boolean => (
            state.label.id !== label.id ||
            Object.entries(changedAttributes).some(([attrID, value]) => state.attributes[+attrID] !== value)
        ));
        const skipped = selected.length - changeable.length;

        for (const state of states) {
            if (state.label.id !== label.id) {
                state.label = label;
                if (Object.keys(changedAttributes).length) {
                    // values of the previous label attributes would not pass validation of the new label
                    for (const attrID of Object.keys(state.attributes)) {
                        if (!labelAttributeIDs.includes(+attrID)) {
                            delete state.attributes[+attrID];
                        }
                    }
                }
            }

            if (Object.keys(changedAttributes).length) {
                state.attributes = changedAttributes;
            }
        }

        if (states.length) {
            updateAnnotations(states);
        }

        if (skipped) {
            message.warning(
                t('{{skipped}} object(s) kept their label: they are locked, skeletons, ', { skipped }) +
                t('or the label "{{name}}" can not be used for their shape type', { name: label.name }),
            );
        } else if (relabeled.length) {
            message.success(t('Label "{{name}}" set for {{length}} object(s)', { name: label.name, length: states.length }));
        } else if (states.length) {
            message.success(t('Attributes updated for {{length}} object(s)', { length: states.length }));
        }
    };

    private onRemoveSelectedStates = (): void => {
        this.removeSelectedStates();
    };

    private copySelectedStates = (): void => {
        const { copySelectedObjects } = this.props;
        const { copied, skipped, overflow } = copySelectedObjects();

        if (overflow) {
            message.error(t('The selected objects do not fit into the clipboard, try copying fewer of them'));
        } else if (copied) {
            const note = skipped ? t(', {{skipped}} tag(s) skipped', { skipped }) : '';
            message.success(t('{{copied}} object(s) copied{{note}}. Open any frame and press Ctrl+V to paste', { copied, note }));
        } else {
            message.info(t('There is nothing to copy, tags can not be pasted on another frame'));
        }
    };

    private pasteFromClipboard = (): void => {
        const { pasteObjectsFromClipboard } = this.props;

        pasteObjectsFromClipboard().then(({ pasted, skipped }): void => {
            if (pasted) {
                const note = skipped ? t(', {{skipped}} skipped (no such label in the task)', { skipped }) : '';
                message.success(`${pasted} object(s) pasted${note}`);
            } else if (skipped) {
                message.warning(t('None of the copied objects has a matching label in this task'));
            }
        });
    };

    private lockAllStates(locked: boolean): void {
        const { updateAnnotations } = this.props;
        const { filteredStates } = this.state;

        for (const objectState of filteredStates) {
            objectState.lock = locked;
        }

        updateAnnotations(filteredStates);
    }

    private hideAllStates(hidden: boolean): void {
        const { updateAnnotations, editedState, changeHideEditedState } = this.props;
        const { filteredStates } = this.state;

        if (editedState?.shapeType === ShapeType.MASK) {
            changeHideEditedState(hidden);
        }

        for (const objectState of filteredStates) {
            objectState.hidden = hidden;
        }

        updateAnnotations(filteredStates);
    }

    private collapseAllStates(collapsed: boolean): void {
        const { collapseStates } = this.props;
        const { filteredStates } = this.state;

        collapseStates(filteredStates, collapsed);
    }

    public render(): JSX.Element {
        const {
            statesHidden,
            statesLocked,
            activatedStateID,
            activatedElementID,
            selectedStateIDs,
            maxZLayer,
            minZLayer,
            currentZLayer,
            hiddenZLayers,
            keyMap,
            normalizedKeyMap,
            colors,
            colorBy,
            statesCollapsedAll,
            showGroundTruth,
            updateAnnotations,
            changeGroupColor,
            removeObject,
            copyShape,
            switchPropagateVisibility,
            switchSimplifyVisibility,
            changeFrame,
            workspace,
            renderData,
            jobInstance,
            clearSelection,
            clearClipboard,
            clipboardObjectsCount,
        } = this.props;
        const {
            objectStates, sortedStatesID, statesOrdering, filteredStates,
        } = this.state;

        const preventDefault = (event?: KeyboardEvent): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedState = (ignoreElements = false): ObjectState | null => {
            if (activatedStateID !== null) {
                const state = objectStates
                    .find((objectState: ObjectState): boolean => objectState.clientID === activatedStateID);

                if (state && activatedElementID !== null && !ignoreElements) {
                    const element = state.elements
                        .find((_element: ObjectState): boolean => _element.clientID === activatedElementID);
                    return element || null;
                }

                return state || null;
            }

            return null;
        };

        const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
            SWITCH_ALL_LOCK: (event?: KeyboardEvent) => {
                preventDefault(event);
                this.lockAllStates(!statesLocked);
            },
            SWITCH_LOCK: (event?: KeyboardEvent) => {
                preventDefault(event);

                // a multi selection wins over the hovered object, it is an explicit user choice
                if (selectedStateIDs.length) {
                    this.lockSelectedStates();
                    return;
                }

                const state = activatedState();
                if (state) {
                    state.lock = !state.lock;
                    updateAnnotations([state]);
                }
            },
            SWITCH_ALL_HIDDEN: (event?: KeyboardEvent) => {
                preventDefault(event);
                this.hideAllStates(!statesHidden);
            },
            SWITCH_HIDDEN: (event?: KeyboardEvent) => {
                preventDefault(event);

                if (selectedStateIDs.length) {
                    this.hideSelectedStates();
                    return;
                }

                const state = activatedState();
                const {
                    editedState, changeHideEditedState, activeControl, activeObjectHidden,
                } = this.props;
                if (editedState?.shapeType === ShapeType.MASK || activeControl === ActiveControl.DRAW_MASK) {
                    const hide = editedState ? !editedState.hidden : !activeObjectHidden;
                    changeHideEditedState(hide);
                }
                if (state) {
                    state.hidden = !state.hidden;
                    updateAnnotations([state]);
                }
            },
            SWITCH_OCCLUDED: (event?: KeyboardEvent) => {
                preventDefault(event);

                if (selectedStateIDs.length) {
                    this.switchOccludedSelectedStates();
                    return;
                }

                const state = activatedState();
                if (state && isLayerState(state)) {
                    state.occluded = !state.occluded;
                    updateAnnotations([state]);
                }
            },
            SWITCH_PINNED: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state) {
                    state.pinned = !state.pinned;
                    updateAnnotations([state]);
                }
            },
            SWITCH_KEYFRAME: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.objectType === ObjectType.TRACK) {
                    const { first, last } = state.keyframes as NonNullable<typeof state.keyframes>;
                    if (first !== last || !state.keyframe) {
                        state.keyframe = !state.keyframe;
                        updateAnnotations([state]);
                    }
                }
            },
            SWITCH_OUTSIDE: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && (state.objectType === ObjectType.TRACK || state.parentID)) {
                    state.outside = !state.outside;
                    updateAnnotations([state]);
                }
            },
            DELETE_OBJECT_STANDARD_WORKSPACE: (event?: KeyboardEvent) => {
                preventDefault(event);

                if (selectedStateIDs.length) {
                    this.removeSelectedStates(event ? event.shiftKey : false);
                    return;
                }

                const state = activatedState(true);
                if (state) {
                    removeObject(state, event ? event.shiftKey : false);
                }
            },
            CHANGE_OBJECT_COLOR: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state) {
                    if (colorBy === ColorBy.GROUP && state.group) {
                        const colorID = (colors.indexOf(state.group.color) + 1) % colors.length;
                        changeGroupColor(state.group.id, colors[colorID]);
                        return;
                    }

                    if (colorBy === ColorBy.INSTANCE) {
                        const colorID = (colors.indexOf(state.color) + 1) % colors.length;
                        state.color = colors[colorID];
                        updateAnnotations([state]);
                    }
                }
            },
            TO_BACKGROUND: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder = minZLayer - 1;
                    updateAnnotations([state]);
                }
            },
            TO_FOREGROUND: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder = maxZLayer + 1;
                    updateAnnotations([state]);
                }
            },
            TO_ONE_LAYER_BACKWARD: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder -= 1;
                    updateAnnotations([state]);
                }
            },
            TO_ONE_LAYER_FORWARD: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && isLayerState(state)) {
                    state.zOrder += 1;
                    updateAnnotations([state]);
                }
            },
            COPY_SHAPE: () => {
                // a multi selection is copied into the persistent clipboard,
                // it can be pasted on another frame, in another job or in another task
                if (selectedStateIDs.length) {
                    this.copySelectedStates();
                    return;
                }

                const state = activatedState(true);
                if (state) {
                    // dropping the clipboard keeps ctrl+v placing this single shape with the cursor
                    clearClipboard();
                    copyShape(state);
                }
            },
            RUN_ANNOTATIONS_ACTION: () => {
                const state = activatedState(true);
                if (state) {
                    openAnnotationsActionModal({ defaultObjectState: state });
                } else {
                    openAnnotationsActionModal();
                }
            },
            PROPAGATE_OBJECT: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state) {
                    switchPropagateVisibility(true);
                }
            },
            NEXT_KEY_FRAME: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && isAbleToChangeFrame(frame)) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState();
                if (state && state.keyframes) {
                    const frame = typeof state.keyframes.prev === 'number' ? state.keyframes.prev : null;
                    if (frame !== null && isAbleToChangeFrame(frame)) {
                        changeFrame(frame);
                    }
                }
            },
            SIMPLIFY_POLYGON: (event?: KeyboardEvent) => {
                preventDefault(event);
                const state = activatedState(true);
                if (state && [ShapeType.POLYGON, ShapeType.POLYLINE].includes(state.shapeType)) {
                    switchSimplifyVisibility(state.clientID);
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                <ObjectsListComponent
                    statesHidden={statesHidden}
                    statesLocked={statesLocked}
                    statesCollapsedAll={statesCollapsedAll}
                    workspace={workspace}
                    statesOrdering={statesOrdering}
                    currentLayer={currentZLayer}
                    hiddenLayers={hiddenZLayers}
                    sortedStatesID={sortedStatesID}
                    showGroundTruth={showGroundTruth}
                    objectStates={filteredStates}
                    selectedStateIDs={selectedStateIDs}
                    visibleSkeletonElements={renderData.visibleSkeletonElements}
                    switchHiddenAllShortcut={normalizedKeyMap.SWITCH_ALL_HIDDEN}
                    switchLockAllShortcut={normalizedKeyMap.SWITCH_ALL_LOCK}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    selectLayer={this.props.selectLayer}
                    toggleLayersVisibility={this.props.toggleLayersVisibility}
                    moveObjectsToLayer={this.moveObjectsToLayer}
                    moveObjectsOnNewLayer={this.moveObjectsOnNewLayer}
                    compactLayers={this.compactLayers}
                    lockAllStates={this.onLockAllStates}
                    unlockAllStates={this.onUnlockAllStates}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                    hideAllStates={this.onHideAllStates}
                    showAllStates={this.onShowAllStates}
                    changeShowGroundTruth={this.changeShowGroundTruth}
                    clearSelection={clearSelection}
                    clipboardObjectsCount={clipboardObjectsCount}
                    copySelectedStates={this.copySelectedStates}
                    pasteFromClipboard={this.pasteFromClipboard}
                    clearClipboard={clearClipboard}
                    lockSelectedStates={this.lockSelectedStates}
                    hideSelectedStates={this.hideSelectedStates}
                    removeSelectedStates={this.onRemoveSelectedStates}
                    selectionLabels={jobInstance.labels
                        .filter((label: Label): boolean => label.type !== LabelType.SKELETON)}
                    changeSelectedStatesLabel={this.changeSelectedStatesLabel}
                />
            </>
        );
    }
}

export default connect(
    mapStateToProps, mapDispatchToProps,
)(ObjectsListContainer);
