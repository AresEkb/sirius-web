/*******************************************************************************
 * Copyright (c) 2021, 2025 Obeo.
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
package org.eclipse.sirius.components.core;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.eclipse.sirius.components.core.api.IURLParser;
import org.springframework.stereotype.Service;

/**
 * Used to parse URLs.
 *
 * @author sbegaudeau
 */
@Service
public class URLParser implements IURLParser {

    @Override
    public Map<String, List<String>> getParameterValues(String kind) {
        Map<String, List<String>> parameterValues = new HashMap<>();

        String[] queryParameters = Optional.ofNullable(URI.create(kind).getRawQuery()).orElse("").split("&");
        for (String queryParameter : queryParameters) {
            String[] data = queryParameter.split("=");
            if (data.length == 2 && !data[0].isBlank() && !data[1].isBlank()) {
                var key = URLDecoder.decode(data[0], StandardCharsets.UTF_8);
                var value = URLDecoder.decode(data[1], StandardCharsets.UTF_8);

                List<String> values = parameterValues.getOrDefault(key, new ArrayList<>());
                values.add(value);

                parameterValues.put(key, values);
            }
        }

        return parameterValues;
    }

    @Override
    public List<String> getParameterEntries(String value) {
        if (value.startsWith("[") && value.endsWith("]") && value.length() >= 3) {
            var rawValue = value.substring(1, value.length() - 1);
            return this.parseEntries(rawValue);
        }
        return List.of();
    }

    private List<String> parseEntries(String rawValue) {
        List<String> entries = new ArrayList<>();
        int start = 0;
        int level = 0;

        for (int i = 0; i < rawValue.length(); i++) {
            char c = rawValue.charAt(i);
            if (c == '[') {
                level++;
            } else if (c == ']') {
                level--;
            } else if (c == ',' && level == 0) {
                entries.add(rawValue.substring(start, i).trim());
                start = i + 1;
            }
        }
        entries.add(rawValue.substring(start).trim());

        return entries;
    }
}
