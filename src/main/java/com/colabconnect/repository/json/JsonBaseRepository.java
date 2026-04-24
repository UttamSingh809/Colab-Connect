package com.colabconnect.repository.json;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public abstract class JsonBaseRepository {
    protected final ObjectMapper mapper;

    public JsonBaseRepository() {
        this.mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    protected <K, V> Map<K, V> loadMap(File file, TypeReference<ConcurrentHashMap<K, V>> typeRef) {
        if (!file.exists()) {
            return new ConcurrentHashMap<>();
        }
        try {
            return mapper.readValue(file, typeRef);
        } catch (IOException e) {
            e.printStackTrace();
            return new ConcurrentHashMap<>();
        }
    }

    protected void saveMap(File file, Map<?, ?> map) {
        try {
            file.getParentFile().mkdirs();
            mapper.writeValue(file, map);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
