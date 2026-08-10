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

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.IRepresentationEventProcessor;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IChangeDescriptionListener;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IEditingContextEventProcessorExecutorServiceProvider;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IInputDispatcher;
import org.eclipse.sirius.components.collaborative.editingcontext.api.IRepresentationEventProcessorProvider;
import org.eclipse.sirius.components.collaborative.representations.api.IRepresentationEventProcessorRegistry;
import org.eclipse.sirius.components.core.api.ErrorPayload;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IInput;
import org.eclipse.sirius.components.core.api.IPayload;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import reactor.core.publisher.Sinks;

/**
 * An input is handed to the editing context by submitting it and waiting for the result. Work that never finishes, or a
 * task that is never run at all, leaves that wait with nothing to wait for: the thread which handed the input over is
 * parked for as long as the server lives, the caller is answered as though the work had been done, and nothing says
 * otherwise anywhere.
 *
 * <p>
 * Threads lost this way are never recovered. They accumulate until the pools they came from have none left, at which
 * point everything they carried - saving a model among it - has stopped, silently, until the server is restarted.
 * </p>
 *
 * @author sbegaudeau
 */
public class EditingContextEventProcessorInputTimeoutTests {

    @Test
    public void testHandlingAnInputThatNeverFinishesAnswersRatherThanWaitingForever() {
        CountDownLatch neverReleased = new CountDownLatch(1);
        var editingContextEventProcessor = this.createEditingContextEventProcessor(neverReleased);

        IPayload payload = editingContextEventProcessor.handle(new TestInput(UUID.randomUUID())).block(Duration.ofSeconds(30));

        assertThat(payload)
                .as("an input which never finishes has to be answered, not waited on for the life of the server")
                .isInstanceOf(ErrorPayload.class);

        neverReleased.countDown();
        editingContextEventProcessor.dispose();
    }

    private EditingContextEventProcessor createEditingContextEventProcessor(CountDownLatch neverReleased) {
        IEditingContext editingContext = () -> "editingContext";

        IEditingContextEventProcessorExecutorServiceProvider executorServiceProvider = context -> Executors.newSingleThreadExecutor();

        IInputDispatcher inputDispatcher = new IInputDispatcher() {
            @Override
            public void dispatch(ExecutorService executorService, Sinks.One<IPayload> payloadSink, Sinks.Many<Boolean> canBeDisposedSink, Sinks.Many<ChangeDescription> changeDescriptionSink, IEditingContext context, IInput input) {
                try {
                    neverReleased.await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
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

        return new EditingContextEventProcessor(executorServiceProvider, editingContext, representationEventProcessorRegistry, changeDescriptionListener, inputDispatcher, representationEventProcessorProvider, new SimpleMeterRegistry()) {
            @Override
            protected Duration getInputTimeout() {
                return Duration.ofSeconds(2);
            }
        };
    }

    /**
     * An input which the dispatcher never finishes handling.
     *
     * @param id the input id
     */
    private record TestInput(UUID id) implements IInput {
    }
}
