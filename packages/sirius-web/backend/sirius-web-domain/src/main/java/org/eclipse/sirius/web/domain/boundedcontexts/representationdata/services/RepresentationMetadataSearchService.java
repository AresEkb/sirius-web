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
package org.eclipse.sirius.web.domain.boundedcontexts.representationdata.services;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.eclipse.sirius.web.domain.boundedcontexts.representationdata.RepresentationMetadata;
import org.eclipse.sirius.web.domain.boundedcontexts.representationdata.repositories.IRepresentationMetadataRepository;
import org.eclipse.sirius.web.domain.boundedcontexts.representationdata.services.api.IRepresentationMetadataSearchService;
import org.eclipse.sirius.web.domain.boundedcontexts.semanticdata.SemanticData;
import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.stereotype.Service;

/**
 * Used to find representation metadata.
 *
 * @author sbegaudeau
 */
@Service
public class RepresentationMetadataSearchService implements IRepresentationMetadataSearchService {

    private final IRepresentationMetadataRepository representationMetadataRepository;

    public RepresentationMetadataSearchService(IRepresentationMetadataRepository representationMetadataRepository) {
        this.representationMetadataRepository = Objects.requireNonNull(representationMetadataRepository);
    }

    @Override
    public boolean existsById(UUID id) {
        return this.representationMetadataRepository.existsById(id);
    }

    @Override
    public Optional<RepresentationMetadata> findMetadataById(UUID id) {
        return this.representationMetadataRepository.findMetadataById(id);
    }

    @Override
    public boolean existsByIdAndKind(UUID id, List<String> kinds) {
        return this.representationMetadataRepository.existsByIdAndKind(id, kinds);
    }

    @Override
    public List<RepresentationMetadata> findAllRepresentationMetadataBySemanticData(AggregateReference<SemanticData, UUID> semanticData) {
        return this.representationMetadataRepository.findAllRepresentationMetadataBySemanticDataId(semanticData.getId());
    }

    @Override
    public List<RepresentationMetadata> findAllRepresentationMetadataBySemanticDataAndTargetObjectId(AggregateReference<SemanticData, UUID> semanticData, String targetObjectId) {
        return this.representationMetadataRepository.findAllRepresentationMetadataBySemanticDataIdAndTargetObjectId(semanticData.getId(), targetObjectId);
    }

    @Override
    public boolean existAnyRepresentationMetadataForSemanticDataAndTargetObjectId(AggregateReference<SemanticData, UUID> semanticData, String targetObjectId) {
        return this.representationMetadataRepository.existAnyRepresentationMetadataForSemanticDataIdAndTargetObjectId(semanticData.getId(), targetObjectId);
    }

    @Override
    public Optional<AggregateReference<SemanticData, UUID>> findSemanticDataByRepresentationId(UUID representationId) {
        return this.representationMetadataRepository.findSemanticDataIdFromRepresentationId(representationId)
                .map(AggregateReference::to);
    }
}
