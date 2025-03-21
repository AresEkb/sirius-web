/*******************************************************************************
 * Copyright (c) 2025 Obeo.
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *     Obeo - initial API and implementation
 *******************************************************************************/
package org.eclipse.sirius.web.application.library.controllers;

import java.util.Objects;

import org.eclipse.sirius.components.annotations.spring.graphql.QueryDataFetcher;
import org.eclipse.sirius.components.graphql.api.IDataFetcherWithFieldCoordinates;
import org.eclipse.sirius.web.application.library.dto.LibraryDTO;
import org.eclipse.sirius.web.application.library.services.api.ILibraryApplicationService;

import graphql.schema.DataFetchingEnvironment;

/**
 * Data fetcher for the field Viewer#library.
 *
 * @author mcharfadi
 */
@QueryDataFetcher(type = "Viewer", field = "library")
public class ViewerLibraryDataFetcher implements IDataFetcherWithFieldCoordinates<LibraryDTO> {

    private static final String INPUT_ARGUMENT_NAMESPACE = "namespace";

    private static final String INPUT_ARGUMENT_NAME = "name";

    private static final String INPUT_ARGUMENT_VERSION = "version";

    private final ILibraryApplicationService libraryApplicationService;

    public ViewerLibraryDataFetcher(ILibraryApplicationService libraryApplicationService) {
        this.libraryApplicationService = Objects.requireNonNull(libraryApplicationService);
    }

    @Override
    public LibraryDTO get(DataFetchingEnvironment environment) throws Exception {
        String namespace = environment.getArgument(INPUT_ARGUMENT_NAMESPACE);
        String name = environment.getArgument(INPUT_ARGUMENT_NAME);
        String version = environment.getArgument(INPUT_ARGUMENT_VERSION);

        return this.libraryApplicationService.findByNamespaceAndNameAndVersion(namespace, name, version).orElse(null);
    }
}
