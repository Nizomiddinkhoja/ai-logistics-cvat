// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ShapeType } from 'cvat-core-wrapper';

/**
 * Moves an object by (dx, dy) in image coordinates.
 *
 * Masks keep their pixels in a run length encoding followed by the bounding box,
 * so only the box is moved. Every other shape, skeletons included, keeps a flat
 * list of coordinate pairs.
 */
export default function shiftObjectPoints(objectState: ObjectState, dx: number, dy: number): void {
    const points = objectState.points || [];

    if (!points.length) {
        return;
    }

    if (objectState.shapeType === ShapeType.MASK) {
        const [left, top, right, bottom] = points.slice(-4);
        const shiftedX = Math.round(dx);
        const shiftedY = Math.round(dy);

        objectState.points = [
            ...points.slice(0, -4),
            left + shiftedX,
            top + shiftedY,
            right + shiftedX,
            bottom + shiftedY,
        ];

        return;
    }

    objectState.points = points.map((coordinate: number, index: number): number => (
        index % 2 === 0 ? coordinate + dx : coordinate + dy
    ));
}
