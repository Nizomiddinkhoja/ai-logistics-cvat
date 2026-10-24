// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

/**
 * Client IDs of the objects in the order they are currently displayed in the sidebar.
 * A shift+click range selection relies on it, so that the selected range is exactly
 * what a user sees between the two clicked items.
 */
const ObjectsListOrderingContext = React.createContext<number[]>([]);

export default ObjectsListOrderingContext;
