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
package org.eclipse.sirius.web.application.undo.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.eclipse.emf.ecore.EcoreFactory;
import org.eclipse.emf.ecore.change.ChangeDescription;
import org.eclipse.emf.ecore.change.util.ChangeRecorder;
import org.eclipse.emf.ecore.resource.impl.ResourceImpl;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.edit.domain.AdapterFactoryEditingDomain;
import org.eclipse.sirius.components.core.api.IInput;
import org.eclipse.sirius.web.application.editingcontext.EditingContext;
import org.junit.jupiter.api.Test;

import reactor.core.publisher.Sinks;

/**
 * A step must regard objects made by earlier steps as existing objects.
 *
 * @author dnikiforov
 */
public class UndoRedoRecorderTests {

    @Test
    public void testDeletingAnObjectCreatedByAnEarlierStepPreservesItsReferencesForUndo() {
        var resourceSet = new ResourceSetImpl();
        var resource = new ResourceImpl();
        resourceSet.getResources().add(resource);
        var model = EcoreFactory.eINSTANCE.createEPackage();
        var base = EcoreFactory.eINSTANCE.createEClass();
        model.getEClassifiers().add(base);
        resource.getContents().add(model);
        var context = mock(EditingContext.class);
        var domain = mock(AdapterFactoryEditingDomain.class);
        when(domain.getResourceSet()).thenReturn(resourceSet);
        when(context.getDomain()).thenReturn(domain);
        when(context.getChangeRecorder()).thenReturn(new ChangeRecorder(resourceSet));
        Map<UUID, ChangeDescription> changes = new HashMap<>();
        when(context.getInputId2change()).thenReturn(changes);
        var recorder = new UndoRedoRecorder(List.of());
        var sink = Sinks.many().unicast().<org.eclipse.sirius.components.collaborative.api.ChangeDescription>onBackpressureBuffer();
        var creation = mock(IInput.class);
        when(creation.id()).thenReturn(UUID.randomUUID());
        recorder.preProcess(context, creation, sink);
        var child = EcoreFactory.eINSTANCE.createEClass();
        child.getESuperTypes().add(base);
        model.getEClassifiers().add(child);
        recorder.postProcess(context, creation, sink);

        var deletion = mock(IInput.class);
        when(deletion.id()).thenReturn(UUID.randomUUID());
        recorder.preProcess(context, deletion, sink);
        // Like semantic deletion, clean outgoing references while the object is still attached.
        child.getESuperTypes().clear();
        EcoreUtil.remove(child);
        recorder.postProcess(context, deletion, sink);
        var change = changes.get(deletion.id());
        for (var cycle = 0; cycle < 3; cycle++) {
            change.applyAndReverse();
            assertThat(model.getEClassifiers()).containsExactly(base, child);
            assertThat(child.getESuperTypes()).containsExactly(base);
            change.applyAndReverse();
            assertThat(model.getEClassifiers()).containsExactly(base);
        }
        context.getChangeRecorder().dispose();
    }
}
