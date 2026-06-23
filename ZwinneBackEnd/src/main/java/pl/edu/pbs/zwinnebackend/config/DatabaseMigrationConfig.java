package pl.edu.pbs.zwinnebackend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class DatabaseMigrationConfig implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            log.info("Running database migration: dropping NOT NULL constraint on wiadomosc_chat.nadawca_id");
            jdbcTemplate.execute("ALTER TABLE wiadomosc_chat ALTER COLUMN nadawca_id DROP NOT NULL");
            log.info("Database migration completed successfully.");
        } catch (Exception e) {
            log.warn("Could not drop NOT NULL constraint on nadawca_id (it may have been done already or the table is not initialized yet): {}", e.getMessage());
        }
    }
}
