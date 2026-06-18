# E-Sagip
 Developing a Mobile-First Responsive Web Application for Post-Disaster Volunteer Management in Barangay 628, Sta. Mesa, Manila

--1. query this on to your MYSQL phpmy admin for database
-- ============================================================
--  E-Sagip · BDRRMC Barangay 628 Volunteer System
--  MySQL Database Schema  (v2 — adds admin/superadmin roles)
-- ============================================================

CREATE DATABASE IF NOT EXISTS esagip CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE esagip;

-- ------------------------------------------------------------
-- 1. ADMINS
--    role: 'admin'      = day-to-day BDRRMC coordinator
--                          (manage volunteers, operations, feed)
--          'superadmin'  = full control: manage other admins,
--                          edit community info page, export data
-- ------------------------------------------------------------
CREATE TABLE admins (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    role          ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin',
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. VOLUNTEERS
-- ------------------------------------------------------------
CREATE TABLE volunteers (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    birthdate         DATE         NOT NULL,
    gender            ENUM('Male','Female','Prefer not to say') DEFAULT NULL,
    is_resident       TINYINT(1)   NOT NULL DEFAULT 1,   -- 1 = Brgy 628 resident
    address           VARCHAR(255) NOT NULL,             -- resident or outside address
    contact_number    VARCHAR(15)  NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    ec_name           VARCHAR(100) DEFAULT NULL,         -- emergency contact name
    ec_number         VARCHAR(15)  DEFAULT NULL,         -- emergency contact number
    security_question VARCHAR(200) NOT NULL,
    security_answer   VARCHAR(200) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    status            ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 3. SKILLS  (master list)
-- ------------------------------------------------------------
CREATE TABLE skills (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name     VARCHAR(100) NOT NULL UNIQUE,
    category ENUM(
        'Logistics & Relief Operations',
        'Physical Labor & Clean-Up',
        'Community Support & Welfare',
        'Medical & First Aid',
        'Transport & Technical',
        'Others'
    ) NOT NULL
);

-- Seed the skills from the registration form
INSERT INTO skills (name, category) VALUES
  ('Relief Goods Packing',             'Logistics & Relief Operations'),
  ('Donation Sorting',                 'Logistics & Relief Operations'),
  ('Inventory & Listing',              'Logistics & Relief Operations'),
  ('Debris Clearing & Heavy Lifting',  'Physical Labor & Clean-Up'),
  ('Mud Clearing & Sweeping',          'Physical Labor & Clean-Up'),
  ('Basic Carpentry',                  'Physical Labor & Clean-Up'),
  ('Community Kitchen / Cooking',      'Community Support & Welfare'),
  ('Crowd Control & Ushering',         'Community Support & Welfare'),
  ('Child & Elderly Care',             'Community Support & Welfare'),
  ('Basic First Aid / CPR',            'Medical & First Aid'),
  ('Medical Professional',             'Medical & First Aid'),
  ('Psychological First Aid',          'Medical & First Aid'),
  ('Driver (4-Wheel / Truck / Van)',   'Transport & Technical'),
  ('Basic Electrical / Wiring Safety', 'Transport & Technical'),
  ('Boat / Bangka Operator',           'Transport & Technical');

-- ------------------------------------------------------------
-- 4. VOLUNTEER SKILLS  (many-to-many)
-- ------------------------------------------------------------
CREATE TABLE volunteer_skills (
    volunteer_id INT UNSIGNED NOT NULL,
    skill_id     INT UNSIGNED NOT NULL,
    PRIMARY KEY  (volunteer_id, skill_id),
    CONSTRAINT fk_vs_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
    CONSTRAINT fk_vs_skill     FOREIGN KEY (skill_id)     REFERENCES skills(id)     ON DELETE CASCADE
);

-- Volunteers may also specify free-text "other" skills
CREATE TABLE volunteer_other_skills (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT UNSIGNED NOT NULL,
    description  TEXT         NOT NULL,
    CONSTRAINT fk_vos_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 5. OPERATIONS
-- ------------------------------------------------------------
CREATE TABLE operations (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(150)  NOT NULL,
    location       VARCHAR(255)  NOT NULL,
    scheduled_at   DATETIME      NOT NULL,
    volunteer_slots INT UNSIGNED NOT NULL DEFAULT 1,
    description    TEXT          DEFAULT NULL,
    status         ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
    created_by     INT UNSIGNED  NOT NULL,  -- admin who deployed
    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_op_admin FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- ------------------------------------------------------------
-- 6. OPERATION SKILLS  (skills required per operation)
-- ------------------------------------------------------------
CREATE TABLE operation_skills (
    operation_id INT UNSIGNED NOT NULL,
    skill_id     INT UNSIGNED NOT NULL,
    PRIMARY KEY  (operation_id, skill_id),
    CONSTRAINT fk_os_operation FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    CONSTRAINT fk_os_skill     FOREIGN KEY (skill_id)     REFERENCES skills(id)     ON DELETE CASCADE
);

-- Free-text "others" for operations too
CREATE TABLE operation_other_skills (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    operation_id INT UNSIGNED NOT NULL,
    description  TEXT         NOT NULL,
    CONSTRAINT fk_oos_operation FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 7. ENROLLMENTS  (volunteer ↔ operation)
-- ------------------------------------------------------------
CREATE TABLE enrollments (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT UNSIGNED NOT NULL,
    operation_id INT UNSIGNED NOT NULL,
    status       ENUM('enrolled','completed','absent') NOT NULL DEFAULT 'enrolled',
    enrolled_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enrollment (volunteer_id, operation_id),
    CONSTRAINT fk_en_volunteer  FOREIGN KEY (volunteer_id)  REFERENCES volunteers(id)  ON DELETE CASCADE,
    CONSTRAINT fk_en_operation  FOREIGN KEY (operation_id)  REFERENCES operations(id)  ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 8. FEED POSTS  (completed operation highlights)
-- ------------------------------------------------------------
CREATE TABLE feed_posts (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    operation_id    INT UNSIGNED NOT NULL,
    image_path      VARCHAR(255) DEFAULT NULL,
    families_helped INT UNSIGNED DEFAULT 0,
    description     TEXT         DEFAULT NULL,
    hashtags        VARCHAR(500) DEFAULT NULL,   -- stored as space-separated e.g. "#ReliefOps #Brgy628"
    like_count      INT UNSIGNED NOT NULL DEFAULT 0,
    posted_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fp_operation FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- USEFUL VIEWS
-- ------------------------------------------------------------

-- How many active volunteers per skill (for Dashboard bar chart)
CREATE OR REPLACE VIEW vw_skill_distribution AS
SELECT
    s.name         AS skill_name,
    s.category,
    COUNT(vs.volunteer_id) AS volunteer_count
FROM skills s
LEFT JOIN volunteer_skills vs ON vs.skill_id = s.id
LEFT JOIN volunteers v ON v.id = vs.volunteer_id AND v.status = 'active'
GROUP BY s.id, s.name, s.category;

-- Enrollment count per active operation (for Dashboard op cards)
CREATE OR REPLACE VIEW vw_operation_enrollment AS
SELECT
    o.id,
    o.title,
    o.location,
    o.scheduled_at,
    o.volunteer_slots,
    o.status,
    COUNT(e.id) AS enrolled_count
FROM operations o
LEFT JOIN enrollments e ON e.operation_id = o.id AND e.status = 'enrolled'
GROUP BY o.id;

-- Volunteer leaderboard (total completed operations)
CREATE OR REPLACE VIEW vw_leaderboard AS
SELECT
    v.id,
    CONCAT(v.first_name, ' ', v.last_name) AS full_name,
    COUNT(e.id) AS completed_ops
FROM volunteers v
LEFT JOIN enrollments e ON e.volunteer_id = v.id AND e.status = 'completed'
GROUP BY v.id
ORDER BY completed_ops DESC;

-- ------------------------------------------------------------
-- SEED: Promote a superadmin account
--   Replace the email below with the admin account you log
--   in with, then uncomment and run this line.
-- ------------------------------------------------------------
-- UPDATE admins SET role = 'superadmin' WHERE email = 'admin@gmail.com';
