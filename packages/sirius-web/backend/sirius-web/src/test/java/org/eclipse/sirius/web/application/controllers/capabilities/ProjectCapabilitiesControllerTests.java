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
package org.eclipse.sirius.web.application.controllers.capabilities;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;

import java.util.Map;

import org.eclipse.sirius.web.AbstractIntegrationTests;
import org.eclipse.sirius.web.data.TestIdentifiers;
import org.eclipse.sirius.web.tests.data.GivenSiriusWebServer;
import org.eclipse.sirius.web.tests.graphql.ProjectCapabilitiesQueryRunner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests of Project capabilities.
 *
 * @author gcoutable
 */
@Transactional
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class ProjectCapabilitiesControllerTests extends AbstractIntegrationTests {

    @Autowired
    private ProjectCapabilitiesQueryRunner projectCapabilitiesQueryRunner;

    @Test
    @GivenSiriusWebServer
    @DisplayName("Given a server, when a query to retrieve capabilities of a project is executed, then it return true by default")
    public void givenAServerWhenQueryToRetrieveCapabilitiesIsExecutedThenItReturnsTrueByDefault() {
        var result = this.projectCapabilitiesQueryRunner.run(Map.of("projectId", TestIdentifiers.ECORE_SAMPLE_PROJECT));
        boolean canDownload = JsonPath.read(result, "$.data.viewer.project.capabilities.canDownload");
        boolean canRename = JsonPath.read(result, "$.data.viewer.project.capabilities.canRename");
        boolean canDelete = JsonPath.read(result, "$.data.viewer.project.capabilities.canDelete");
        boolean canEdit = JsonPath.read(result, "$.data.viewer.project.capabilities.canEdit");
        assertThat(canDownload).isTrue();
        assertThat(canRename).isTrue();
        assertThat(canDelete).isTrue();
        assertThat(canEdit).isTrue();
    }

    @Test
    @GivenSiriusWebServer
    @DisplayName("Given a capability voter that deny all capabilities on a specific project, when a query to retrieve capabilities on that specific project is executed, then capabilities are all false")
    public void givenACapabilityVoterThatDenyAllCapabilitiesOnASpecificProjectWhenAQueryToRetrieveCapabilitiesOnThatSpecificProjectIsExecutedThenCapabilitiesAreAllFalse() {
        var result = this.projectCapabilitiesQueryRunner.run(Map.of("projectId", TestIdentifiers.SYSML_SAMPLE_PROJECT));
        boolean canDownload = JsonPath.read(result, "$.data.viewer.project.capabilities.canDownload");
        boolean canRename = JsonPath.read(result, "$.data.viewer.project.capabilities.canRename");
        boolean canDelete = JsonPath.read(result, "$.data.viewer.project.capabilities.canDelete");
        boolean canEdit = JsonPath.read(result, "$.data.viewer.project.capabilities.canEdit");
        assertThat(canDownload).isFalse();
        assertThat(canRename).isFalse();
        assertThat(canDelete).isFalse();
        assertThat(canEdit).isFalse();
    }

}
