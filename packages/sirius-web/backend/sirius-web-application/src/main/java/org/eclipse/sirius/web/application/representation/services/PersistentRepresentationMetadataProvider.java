/*******************************************************************************
 * Copyright (c) 2024, 2025 Obeo.
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
package org.eclipse.sirius.web.application.representation.services;

import java.util.Objects;
import java.util.Optional;

import org.eclipse.sirius.components.core.RepresentationMetadata;
import org.eclipse.sirius.components.core.api.IRepresentationMetadataProvider;
import org.eclipse.sirius.web.application.UUIDParser;
import org.eclipse.sirius.web.domain.boundedcontexts.representationdata.RepresentationIconURL;
import org.eclipse.sirius.web.domain.boundedcontexts.representationdata.services.api.IRepresentationMetadataSearchService;
import org.springframework.stereotype.Service;

/**
 * Implementation of {@link IRepresentationMetadataProvider} for persistent representations stored in the database.
 *
 * @author pcdavid
 */
@Service
public class PersistentRepresentationMetadataProvider implements IRepresentationMetadataProvider {

    private static final String URL_PARAM = "?";

    private final IRepresentationMetadataSearchService representationMetadataSearchService;

    public PersistentRepresentationMetadataProvider(IRepresentationMetadataSearchService representationMetadataSearchService) {
        this.representationMetadataSearchService = Objects.requireNonNull(representationMetadataSearchService);
    }

    @Override
    public Optional<RepresentationMetadata> getMetadata(String representationId) {
        var cleanRepresentationId = representationId;
        if (representationId.indexOf(URL_PARAM) > 0) {
            cleanRepresentationId = representationId.substring(0, representationId.indexOf(URL_PARAM));
        }
        return new UUIDParser().parse(cleanRepresentationId)
                .flatMap(this.representationMetadataSearchService::findMetadataById)
                .map(representation -> RepresentationMetadata.newRepresentationMetadata(representation.getId().toString())
                        .kind(representation.getKind())
                        .label(representation.getLabel())
                        .descriptionId(representation.getDescriptionId())
                        .iconURLs(representation.getIconURLs().stream()
                                .map(RepresentationIconURL::url)
                                .toList())
                        .build());
    }

}
