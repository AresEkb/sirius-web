/*******************************************************************************
 * Copyright (c) 2024, 2026 Obeo.
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
package org.eclipse.sirius.web.domain.boundedcontexts;

import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.AbstractAggregateRoot;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

/**
 * Used to validate all the domain events sent by the aggregate root.
 *
 * @param <AGGREGATE_ROOT_TYPE> The type of the aggregate root
 *
 * @author sbegaudeau
 */
public class AbstractValidatingAggregateRoot<AGGREGATE_ROOT_TYPE extends AbstractValidatingAggregateRoot<AGGREGATE_ROOT_TYPE>> extends AbstractAggregateRoot<AGGREGATE_ROOT_TYPE> {
    // Building a validator factory runs a full classpath ServiceLoader scan, so it is built once and
    // shared. Validator instances are thread-safe and meant to live for the lifetime of the application.
    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Transient
    private final Logger logger = LoggerFactory.getLogger(AbstractValidatingAggregateRoot.class);

    @Override
    protected <EVENT_TYPE> EVENT_TYPE registerEvent(EVENT_TYPE event) {
        var violations = VALIDATOR.validate(event);
        if (!violations.isEmpty()) {
            var message = violations.stream()
                    .map(violation -> violation.getPropertyPath().toString() + " " + violation.getMessage())
                    .collect(Collectors.joining(", "));

            this.logger.atWarn()
                    .setMessage(message)
                    .log();
        }
        return super.registerEvent(event);
    }
}
