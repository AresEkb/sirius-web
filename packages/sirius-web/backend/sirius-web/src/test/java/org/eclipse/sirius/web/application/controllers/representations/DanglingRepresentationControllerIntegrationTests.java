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
package org.eclipse.sirius.web.application.controllers.representations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.eclipse.sirius.components.portals.tests.PortalEventPayloadConsumer.assertRefreshedPortalThat;

import java.time.Duration;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.function.Consumer;

import org.eclipse.sirius.components.collaborative.api.ChangeDescription;
import org.eclipse.sirius.components.collaborative.api.ChangeKind;
import org.eclipse.sirius.components.collaborative.portals.dto.PortalEventInput;
import org.eclipse.sirius.components.core.api.IEditingContext;
import org.eclipse.sirius.components.core.api.IInput;
import org.eclipse.sirius.components.core.api.IPayload;
import org.eclipse.sirius.components.core.api.SuccessPayload;
import org.eclipse.sirius.components.emf.services.api.IEMFEditingContext;
import org.eclipse.sirius.components.graphql.tests.ExecuteEditingContextFunctionInput;
import org.eclipse.sirius.components.graphql.tests.ExecuteEditingContextFunctionRunner;
import org.eclipse.sirius.components.portals.tests.graphql.PortalEventSubscriptionRunner;
import org.eclipse.sirius.web.AbstractIntegrationTests;
import org.eclipse.sirius.web.data.TestIdentifiers;
import org.eclipse.sirius.web.tests.data.GivenSiriusWebServer;
import org.eclipse.sirius.web.tests.services.api.IGivenInitialServerState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;
import reactor.test.StepVerifier;

/**
 * Used to test the proper deletion of dangling representations.
 *
 * @author sbegaudeau
 */
@Transactional
@SuppressWarnings("checkstyle:MultipleStringLiterals")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class DanglingRepresentationControllerIntegrationTests extends AbstractIntegrationTests {

    @Autowired
    private IGivenInitialServerState givenInitialServerState;

    @Autowired
    private PortalEventSubscriptionRunner portalEventSubscriptionRunner;

    @Autowired
    private ExecuteEditingContextFunctionRunner executeEditingContextFunctionRunner;

    @BeforeEach
    public void beforeEach() {
        this.givenInitialServerState.initialize();
    }

    @Test
    @GivenSiriusWebServer
    @DisplayName("Given a project, when we delete an object with a child representation, then the representation is deleted")
    public void givenProjectWhenWeDeleteAnObjectWithChildRepresentationThenTheRepresentationIsDeleted() {
        var portalEventInput = new PortalEventInput(UUID.randomUUID(), TestIdentifiers.ECORE_SAMPLE_EDITING_CONTEXT_ID.toString(), TestIdentifiers.EPACKAGE_PORTAL_REPRESENTATION.toString());
        var portalFlux = this.portalEventSubscriptionRunner.run(portalEventInput);

        Consumer<Object> portalContentMatcher = assertRefreshedPortalThat(portal -> assertThat(portal).isNotNull());

        Runnable deleteProjectContent = () -> {
            BiFunction<IEditingContext, IInput, IPayload> function = (editingContext, input) -> {
                if (editingContext instanceof IEMFEditingContext emfEditingContext) {
                    emfEditingContext.getDomain().getResourceSet().getResources().forEach(resource -> resource.getContents().clear());
                }
                return new SuccessPayload(input.id());
            };

            var inputId = UUID.randomUUID();
            var changeDescription = new ChangeDescription(ChangeKind.SEMANTIC_CHANGE, TestIdentifiers.ECORE_SAMPLE_EDITING_CONTEXT_ID.toString(), () -> inputId);
            var input = new ExecuteEditingContextFunctionInput(inputId, TestIdentifiers.ECORE_SAMPLE_EDITING_CONTEXT_ID.toString(), function, changeDescription);
            var payload = this.executeEditingContextFunctionRunner.execute(input).block();

            assertThat(payload).isInstanceOf(SuccessPayload.class);

            TestTransaction.flagForCommit();
            TestTransaction.end();
            TestTransaction.start();
        };

        StepVerifier.create(portalFlux)
                .consumeNextWith(portalContentMatcher)
                .then(deleteProjectContent)
                .expectComplete()
                .verify(Duration.ofSeconds(10));
    }
}
