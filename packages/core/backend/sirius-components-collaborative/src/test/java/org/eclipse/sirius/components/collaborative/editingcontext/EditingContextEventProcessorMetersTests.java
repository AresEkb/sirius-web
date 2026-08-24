/*******************************************************************************
 * Copyright (c) 2026 Obeo.
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
package org.eclipse.sirius.components.collaborative.editingcontext;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.IRepresentationEventProcessor;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IChangeDescriptionListener;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IEditingContextEventProcessorExecutorServiceProvider;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IInputDispatcher;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IRepresentationEventProcessorProvider;
import org.eclipse.sirius.components.collaborative.representations.api.IRepresentationEventProcessorRegistry;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IInput;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.core.api.SuccessPayload;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import reactor.core.publisher.Sinks;

/**
 * The editing context event processor times the inputs it handles. What it times has to be the kind of input, not the
 * individual one: a meter is kept by the registry for as long as the server runs, so a tag carrying the id of the input
 * registers a new meter for every gesture a modeller makes and never lets one go.
 *
 * <p>
 * The cost is paid twice. The registry grows without bound - tens of thousands of meters over an afternoon - and every
 * input pays to look one up and build it, so the server answers gestures more and more slowly until it is restarted.
 * Neither shows up as an error anywhere.
 * </p>
 *
 * @author sbegaudeau
 */
public class EditingContextEventProcessorMetersTests {

    private static final int INPUTS = 50;

    @Test
    public void testHandlingManyInputsDoesNotRegisterAMeterForEachOfThem() {
        MeterRegistry meterRegistry = new SimpleMeterRegistry();
        var editingContextEventProcessor = this.createEditingContextEventProcessor(meterRegistry);

        for (int i = 0; i < INPUTS; i++) {
            editingContextEventProcessor.handle(new TestInput(UUID.randomUUID())).block();
        }

        assertThat(meterRegistry.getMeters())
                .as("the meters have to count the kinds of input handled, not the inputs themselves")
                .hasSizeLessThan(INPUTS);

        editingContextEventProcessor.dispose();
    }

    private EditingContextEventProcessor createEditingContextEventProcessor(MeterRegistry meterRegistry) {
        IEditingContext editingContext = () -> "editingContext";

        IEditingContextEventProcessorExecutorServiceProvider executorServiceProvider = context -> Executors.newSingleThreadExecutor();

        IInputDispatcher inputDispatcher = new IInputDispatcher() {
            @Override
            public void dispatch(ExecutorService executorService, Sinks.One<IPayload> payloadSink, Sinks.Many<Boolean> canBeDisposedSink, Sinks.Many<ChangeDescription> changeDescriptionSink, IEditingContext context, IInput input) {
                payloadSink.tryEmitValue(new SuccessPayload(input.id()));
            }
        };

        IRepresentationEventProcessorRegistry representationEventProcessorRegistry = new IRepresentationEventProcessorRegistry() {
            @Override
            public void put(String editingContextId, String representationId, RepresentationEventProcessorEntry entry) {
                // Nothing is held, so there is nothing to remember.
            }

            @Override
            public RepresentationEventProcessorEntry get(String editingContextId, String representationId) {
                return null;
            }

            @Override
            public List<IRepresentationEventProcessor> values(String editingContextId) {
                return List.of();
            }

            @Override
            public void disposeRepresentation(String editingContextId, String representationId) {
                // Nothing is held, so there is nothing to let go of.
            }

            @Override
            public void dispose(String editingContextId) {
                // Nothing is held, so there is nothing to let go of.
            }
        };

        IChangeDescriptionListener changeDescriptionListener = (payloadSink, canBeDisposedSink, context, changeDescription) -> {
            // The inputs handled here describe no change, so nothing is listened for.
        };

        IRepresentationEventProcessorProvider representationEventProcessorProvider = (executorService, canBeDisposedSink, context, representationId, input) -> Optional.empty();

        return new EditingContextEventProcessor(executorServiceProvider, editingContext, representationEventProcessorRegistry, changeDescriptionListener, inputDispatcher, representationEventProcessorProvider, meterRegistry);
    }

    /**
     * An input of one kind, told apart from the others only by its id - which is what a meter must not be keyed by.
     *
     * @param id the input id
     */
    private record TestInput(UUID id) implements IInput {
    }
}
