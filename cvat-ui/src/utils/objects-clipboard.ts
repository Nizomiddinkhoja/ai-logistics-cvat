// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Attribute, Label, ObjectState } from 'cvat-core-wrapper';

/**
 * Objects copied by a user live in the browser storage rather than in the store,
 * so that they survive navigation between jobs, tasks and even page reloads.
 * Labels and attributes are referenced by name, because their identifiers
 * differ from task to task.
 */

const STORAGE_KEY = 'cvatObjectsClipboard';
const CLIPBOARD_VERSION = 1;

// localStorage is usually limited to ~5MB, masks are stored as RLE and may be heavy
const MAX_CLIPBOARD_SIZE = 4 * 1024 * 1024;

export interface ClipboardElement {
    labelName: string;
    points: number[];
    occluded: boolean;
    outside: boolean;
    attributes: Record<string, string>;
}

export interface ClipboardObject {
    labelName: string;
    shapeType: string;
    points: number[];
    rotation: number;
    occluded: boolean;
    zOrder: number;
    attributes: Record<string, string>;
    elements: ClipboardElement[];
}

export interface ObjectsClipboard {
    version: number;
    copiedAt: number;
    sourceJobID: number | null;
    objects: ClipboardObject[];
}

export const EMPTY_CLIPBOARD: ObjectsClipboard = {
    version: CLIPBOARD_VERSION,
    copiedAt: 0,
    sourceJobID: null,
    objects: [],
};

function attributesByName(objectState: ObjectState): Record<string, string> {
    const result: Record<string, string> = {};

    objectState.label.attributes.forEach((attribute: Attribute): void => {
        const value = objectState.attributes[attribute.id as number];
        if (typeof value === 'string') {
            result[attribute.name] = value;
        }
    });

    return result;
}

export function serializeObjectsForClipboard(objectStates: ObjectState[]): ClipboardObject[] {
    return objectStates.map((objectState: ObjectState): ClipboardObject => ({
        labelName: objectState.label.name,
        shapeType: objectState.shapeType,
        points: [...(objectState.points || [])],
        rotation: objectState.rotation || 0,
        occluded: objectState.occluded,
        zOrder: objectState.zOrder,
        attributes: attributesByName(objectState),
        elements: objectState.elements.map((element: ObjectState): ClipboardElement => ({
            labelName: element.label.name,
            points: [...(element.points || [])],
            occluded: element.occluded,
            outside: element.outside,
            attributes: attributesByName(element),
        })),
    }));
}

export function readObjectsClipboard(): ObjectsClipboard {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return EMPTY_CLIPBOARD;
        }

        const parsed = JSON.parse(stored) as ObjectsClipboard;
        if (parsed?.version !== CLIPBOARD_VERSION || !Array.isArray(parsed.objects)) {
            return EMPTY_CLIPBOARD;
        }

        return parsed;
    } catch (_: unknown) {
        // a corrupted or unavailable storage must not break the annotation page
        return EMPTY_CLIPBOARD;
    }
}

/** Returns the stored clipboard, or null when the objects did not fit into the storage */
export function writeObjectsClipboard(
    objects: ClipboardObject[],
    sourceJobID: number | null,
): ObjectsClipboard | null {
    const clipboard: ObjectsClipboard = {
        version: CLIPBOARD_VERSION,
        copiedAt: Date.now(),
        sourceJobID,
        objects,
    };

    try {
        const serialized = JSON.stringify(clipboard);
        if (serialized.length > MAX_CLIPBOARD_SIZE) {
            return null;
        }

        localStorage.setItem(STORAGE_KEY, serialized);
        return clipboard;
    } catch (_: unknown) {
        return null;
    }
}

export function removeObjectsClipboard(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (_: unknown) {
        // nothing to do, the clipboard is dropped from the store anyway
    }
}

/**
 * Looks a label up by name, the same label has different identifiers in different tasks.
 */
export function findLabelByName(labels: Label[], name: string): Label | null {
    return labels.find((label: Label): boolean => label.name === name) || null;
}
