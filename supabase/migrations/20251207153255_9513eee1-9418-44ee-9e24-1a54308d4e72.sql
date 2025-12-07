
-- Drop and recreate profiles_safe view to include tenant_id
DROP VIEW IF EXISTS profiles_safe;

CREATE OR REPLACE VIEW profiles_safe AS
SELECT 
    id,
    user_id,
    email,
    full_name,
    avatar_url,
    birth_date,
    hire_date,
    job_title,
    department,
    employee_code,
    location,
    anniversary_date,
    user_category,
    employment_status,
    manager_id,
    sales_sub_team,
    tenant_id,
    created_at,
    updated_at,
    CASE
        WHEN current_user_is_super_admin() THEN is_super_admin
        ELSE false
    END AS is_super_admin
FROM profiles;
