/*******************************************************************************
 * Copyright (c) 2023, 2024 Obeo.
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
package org.eclipse.sirius.components.task.starter.configuration.view;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.eclipse.emf.ecore.EObject;
import org.eclipse.sirius.components.gantt.TaskDetail;
import org.eclipse.sirius.components.task.AbstractTask;
import org.eclipse.sirius.components.task.Project;
import org.eclipse.sirius.components.task.Task;
import org.eclipse.sirius.components.task.TaskFactory;
import org.eclipse.sirius.components.task.TaskTag;

/**
 * Java Service for the task related views.
 *
 * @author lfasani
 */
public class TaskJavaService {

    public TaskJavaService() {
    }

    public TaskDetail getTaskDetail(Task task) {

        String name = Optional.ofNullable(task.getName()).orElse("");
        String description = Optional.ofNullable(task.getDescription()).orElse("");
        Instant startTime = task.getStartTime();
        Instant endTime = task.getEndTime();
        int progress = task.getProgress();
        boolean computeStartEndDynamically = task.isComputeStartEndDynamically();

        return new TaskDetail(name, description, startTime, endTime, progress, computeStartEndDynamically);
    }

    public void editTask(EObject eObject, String name, String description, Instant startTime, Instant endTime, Integer progress) {
        if (eObject instanceof AbstractTask task) {
            if (name != null) {
                task.setName(name);
            }
            if (description != null) {
                task.setDescription(description);
            }
            if (startTime != null) {
                task.setStartTime(startTime);
            }
            if (endTime != null) {
                task.setEndTime(endTime);
            }
            if (progress != null) {
                task.setProgress(progress);
            }
        }
    }

    public void createTask(EObject context) {
        Task task = TaskFactory.eINSTANCE.createTask();
        task.setName("New Task");
        if (context instanceof AbstractTask abstractTask) {
            // The new task follows the context task and has the same duration than the context task.
            if (abstractTask.getEndTime() != null && abstractTask.getStartTime() != null) {
                task.setStartTime(abstractTask.getEndTime());
                task.setEndTime(Instant.ofEpochSecond(2 * abstractTask.getEndTime().getEpochSecond() - abstractTask.getStartTime().getEpochSecond()));
            }

            EObject parent = context.eContainer();
            if (parent instanceof Project project) {
                project.getOwnedTasks().add(task);
            } else if (parent instanceof AbstractTask parentTask) {
                parentTask.getSubTasks().add(task);
            }
        } else if (context instanceof Project project) {
            long epochSecondStartTime = Instant.now().getEpochSecond();
            task.setStartTime(Instant.ofEpochMilli(epochSecondStartTime));
            task.setEndTime(Instant.ofEpochMilli(epochSecondStartTime + 3600 * 4));

            project.getOwnedTasks().add(task);
        }
    }

    public List<Task> getTasksWithTag(TaskTag tag) {
        return Optional.ofNullable(tag.eContainer())//
                .filter(Project.class::isInstance)//
                .map(Project.class::cast)//
                .stream()//
                .map(Project::getOwnedTasks)//
                .flatMap(List::stream)//
                .filter(task -> task.getTags().contains(tag))//
                .toList();

    }
}