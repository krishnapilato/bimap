-- Two schemas, one per service, so neither can read the other tables by accident.
-- MYSQL_DATABASE already created bimap_iam; this adds the second and grants both.

CREATE DATABASE IF NOT EXISTS bimap_core
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON bimap_iam.*  TO 'bimap'@'%';
GRANT ALL PRIVILEGES ON bimap_core.* TO 'bimap'@'%';
FLUSH PRIVILEGES;
