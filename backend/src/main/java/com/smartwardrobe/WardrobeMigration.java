package com.smartwardrobe;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Additive migration for existing phase-one databases; no personal records are removed. */
@Component
@DependsOnDatabaseInitialization
public class WardrobeMigration implements InitializingBean {
    private final JdbcTemplate db;
    public WardrobeMigration(JdbcTemplate db) { this.db=db; }
    public void afterPropertiesSet() {
        db.execute("ALTER TABLE wardrobe_item ADD COLUMN IF NOT EXISTS styles VARCHAR(120) NOT NULL DEFAULT 'Casual'");
        db.execute("ALTER TABLE wear_event ADD COLUMN IF NOT EXISTS dress_style VARCHAR(30) NOT NULL DEFAULT 'Casual'");
        var constraints=db.queryForList("SELECT c.CONSTRAINT_NAME, c.CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS c JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS t ON c.CONSTRAINT_NAME=t.CONSTRAINT_NAME AND c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA WHERE t.TABLE_NAME='WARDROBE_ITEM' AND t.CONSTRAINT_SCHEMA='PUBLIC'");
        for (var constraint:constraints) {
            String clause=constraint.get("CHECK_CLAUSE").toString();
            if (clause.contains("CATEGORY") && !clause.contains("T-shirt")) {
                String name=constraint.get("CONSTRAINT_NAME").toString().replace("\"","\"\"");
                db.execute("ALTER TABLE wardrobe_item DROP CONSTRAINT \""+name+"\"");
                db.execute("ALTER TABLE wardrobe_item ADD CONSTRAINT wardrobe_category_v2 CHECK (category IN ('Shirt','T-shirt','Hoodie','Traditional','Pants','Shoes'))");
            }
        }
    }
}
