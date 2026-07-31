/*******************************************************************************
 * Copyright (c) 2019, 2026 Obeo.
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
package org.eclipse.sirius.components.collaborative.diagrams.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramContext;
import org.eclipse.sirius.components.collaborative.diagrams.DiagramQueryService;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetPaletteInput;
import org.eclipse.sirius.components.collaborative.diagrams.dto.GetPaletteSuccessPayload;
import org.eclipse.sirius.components.collaborative.messages.ICollaborativeMessageService;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.core.api.IRepresentationDescriptionSearchService;
import org.eclipse.sirius.components.diagrams.description.DiagramDescription;
import org.eclipse.sirius.components.representations.IRepresentationDescription;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import reactor.core.publisher.Sinks;

/**
 * Tests palette queries whose selection no longer belongs to the current diagram snapshot.
 *
 * @author Denis Nikiforov
 */
public class GetPaletteEventHandlerTests {

    private static final String DELETED_ID = "deleted";

    public static Stream<List<String>> obsoleteSelections() {
        return Stream.of(null, List.of(), List.of(DELETED_ID), List.of("diagram", DELETED_ID), List.of(DELETED_ID, "also-deleted"));
    }

    @ParameterizedTest
    @MethodSource("obsoleteSelections")
    public void testObsoleteSelectionHasNoTools(List<String> ids) {
        var diagram = new TestDiagramBuilder().getDiagram("diagram");
        IEditingContext editingContext = () -> "context";
        var description = mock(DiagramDescription.class);
        var search = new IRepresentationDescriptionSearchService.NoOp() {
            @Override
            public Optional<IRepresentationDescription> findById(IEditingContext context, String id) {
                return Optional.of(description);
            }
        };
        var handler = new GetPaletteEventHandler(search, new DiagramQueryService(), List.of(),
                new ICollaborativeMessageService.NoOp(), new SimpleMeterRegistry());
        var payload = Sinks.<IPayload>one();
        var changes = Sinks.many().unicast().<ChangeDescription>onBackpressureBuffer();
        var input = new GetPaletteInput(UUID.randomUUID(), editingContext.getId(), diagram.getId(), ids);

        handler.handle(payload, changes, editingContext, new DiagramContext(diagram), input);

        assertThat(payload.asMono().block()).isInstanceOfSatisfying(GetPaletteSuccessPayload.class, success -> {
            assertThat(success.id()).isEqualTo(input.id());
            assertThat(success.palette()).isNotNull();
            assertThat(success.palette().quickAccessTools()).isEmpty();
            assertThat(success.palette().paletteEntries()).isEmpty();
        });
        assertThat(changes.asFlux().blockFirst().getKind()).isEqualTo(ChangeKind.NOTHING);
    }
}
