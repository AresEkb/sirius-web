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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.sirius.components.collaborative.editingcontext.api.IRepresentationEventProcessorProvider;
import org.eclipse.sirius.components.collaborative.representations.RepresentationEventProcessorRegistry;
import org.eclipse.sirius.components.core.api.IInput;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

/**
 * Representation construction reads and adapts the same model that inputs mutate.
 * It must run on the editing context executor, not the WebSocket caller thread.
 *
 * @author sbegaudeau
 */
public class EditingContextEventProcessorAcquisitionTests {

    private static final String EDITING_CONTEXT_ID = "context";
    private static final String REPRESENTATION_ID = "representation";

    @Test
    public void testRepresentationConstructionUsesTheModelExecutor() throws Exception {
        try (var executor = Executors.newSingleThreadExecutor()) {
            Thread modelThread = executor.submit(Thread::currentThread).get();
            var constructionThread = new AtomicReference<Thread>();
            IRepresentationEventProcessorProvider provider = (service, sink, context, representationId, input) -> {
                constructionThread.set(Thread.currentThread());
                return Optional.empty();
            };
            var processor = new EditingContextEventProcessor(context -> executor, () -> EDITING_CONTEXT_ID,
                    new RepresentationEventProcessorRegistry(), (sink, disposable, context, change) -> { },
                    (service, payload, disposable, changes, context, input) -> { }, provider, new SimpleMeterRegistry());
            try {
                assertThat(processor.acquireRepresentationEventProcessor(REPRESENTATION_ID, new TestInput(UUID.randomUUID()))).isEmpty();
                assertThat(constructionThread.get()).isSameAs(modelThread);
            } finally {
                processor.dispose();
            }
        }
    }

    @Test
    public void testFailedRepresentationConstructionReturnsNoProcessor() {
        try (var executor = Executors.newSingleThreadExecutor()) {
            var input = new TestInput(UUID.randomUUID());
            var provider = mock(IRepresentationEventProcessorProvider.class);
            when(provider.acquireRepresentationEventProcessor(any(), any(), any(), eq(REPRESENTATION_ID), eq(input)))
                    .thenThrow(IllegalStateException.class);
            var processor = new EditingContextEventProcessor(context -> executor, () -> EDITING_CONTEXT_ID,
                    new RepresentationEventProcessorRegistry(), (sink, disposable, context, change) -> { },
                    (service, payload, disposable, changes, context, event) -> { }, provider, new SimpleMeterRegistry());
            try {
                assertThat(processor.acquireRepresentationEventProcessor(REPRESENTATION_ID, input)).isEmpty();
            } finally {
                processor.dispose();
            }
        }
    }

    @Test
    public void testDisposalCannotShutDownAnAcquisitionInProgress() throws Exception {
        try (var executor = Executors.newSingleThreadExecutor(); var callers = Executors.newFixedThreadPool(2)) {
            var constructing = new CountDownLatch(1);
            var finishConstruction = new CountDownLatch(1);
            IRepresentationEventProcessorProvider provider = (service, sink, context, representationId, input) -> {
                constructing.countDown();
                try {
                    finishConstruction.await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
                assertThat(service.isShutdown()).as("construction can still subscribe on its model executor").isFalse();
                return Optional.empty();
            };
            var processor = new EditingContextEventProcessor(context -> executor, () -> EDITING_CONTEXT_ID,
                    new RepresentationEventProcessorRegistry(), (sink, disposable, context, change) -> { },
                    (service, payload, disposable, changes, context, input) -> { }, provider, new SimpleMeterRegistry());
            var acquisition = callers.submit(() -> processor.acquireRepresentationEventProcessor(REPRESENTATION_ID, new TestInput(UUID.randomUUID())));
            assertThat(constructing.await(5, TimeUnit.SECONDS)).isTrue();
            var disposingThread = new AtomicReference<Thread>();
            var disposal = callers.submit(() -> {
                disposingThread.set(Thread.currentThread());
                processor.dispose();
            });
            try {
                var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                while (!disposal.isDone() && (disposingThread.get() == null || disposingThread.get().getState() != Thread.State.BLOCKED)
                        && System.nanoTime() < deadline) {
                    Thread.sleep(1);
                }
                assertThat(executor.isShutdown()).as("disposal waits for representation construction").isFalse();
            } finally {
                finishConstruction.countDown();
            }
            assertThat(acquisition.get(5, TimeUnit.SECONDS)).isEmpty();
            disposal.get(5, TimeUnit.SECONDS);
            assertThat(executor.isShutdown()).isTrue();
        }
    }

    /**
     * A subscription input.
     *
     * @param id the input identifier
     */
    private record TestInput(UUID id) implements IInput {
    }
}
