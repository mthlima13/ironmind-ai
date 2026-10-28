package com.ironmind.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;

/**
 * MongoDB settings of the API.
 *
 * <p>The records are recalculated inside the transaction of the change of the set, so the
 * application needs a transaction manager. MongoDB only supports multi document transactions in
 * a replica set, which is the topology used by the development and production deployments.
 */
@Configuration
public class MongoConfig {

    /**
     * Transaction manager used by the {@code @Transactional} boundaries of the services.
     */
    @Bean
    public MongoTransactionManager transactionManager(MongoDatabaseFactory databaseFactory) {
        return new MongoTransactionManager(databaseFactory);
    }
}
