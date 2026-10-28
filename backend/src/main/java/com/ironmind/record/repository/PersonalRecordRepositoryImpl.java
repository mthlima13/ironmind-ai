package com.ironmind.record.repository;

import com.ironmind.record.entity.PersonalRecord;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

/**
 * Implementation of the queries of {@link PersonalRecordRepositoryCustom}.
 */
public class PersonalRecordRepositoryImpl implements PersonalRecordRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public PersonalRecordRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public long countAchievedBetween(UUID userId, Instant from, Instant to) {
        Query query = Query.query(Criteria.where("userId").is(userId)
                .and("achievedAt").gte(from).lt(to));
        return mongoTemplate.count(query, PersonalRecord.class);
    }
}
